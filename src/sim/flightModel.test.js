import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RUNWAY,
  angleDiff,
  excessFpm,
  glideslopeAltitude,
  navGeometry,
  standardRateBank,
  stepAircraft,
  wrap360,
} from './flightModel.js'

const at = (patch) => ({ runway: DEFAULT_RUNWAY, x: 0, y: -5, altitude: 5000, heading: 360, airspeed: 100, ...patch })

describe('angles', () => {
  it('wraps headings into 0–360', () => {
    expect(wrap360(370)).toBe(10)
    expect(wrap360(-10)).toBe(350)
  })

  it('finds the shortest signed turn', () => {
    expect(angleDiff(10, 350)).toBe(20)
    expect(angleDiff(350, 10)).toBe(-20)
  })
})

describe('performance', () => {
  it('holds about 100 KIAS level at 2100 RPM', () => {
    expect(Math.abs(excessFpm(100, 2100))).toBeLessThan(60)
  })

  it('climbs around 700 fpm at Vy with full power', () => {
    expect(excessFpm(74, 2700)).toBeGreaterThan(600)
    expect(excessFpm(74, 2700)).toBeLessThan(850)
  })

  it('costs performance to extend the flaps or to bank', () => {
    expect(excessFpm(80, 2700, 0, true)).toBeLessThan(excessFpm(80, 2700))
    expect(excessFpm(80, 2700, 30)).toBeLessThan(excessFpm(80, 2700))
  })

  it('gives a standard-rate turn at roughly 15° of bank', () => {
    expect(standardRateBank(100)).toBeGreaterThan(13)
    expect(standardRateBank(100)).toBeLessThan(17)
  })
})

describe('navigation geometry', () => {
  it('centres the needles on the extended centreline and glideslope', () => {
    const nav = navGeometry(at({ altitude: glideslopeAltitude(5) + DEFAULT_RUNWAY.elevation }))
    expect(nav.distToThreshold).toBeCloseTo(5)
    expect(nav.xtk).toBeCloseTo(0)
    expect(nav.locDots).toBeCloseTo(0)
    expect(nav.gsDots).toBeCloseTo(0, 1)
  })

  it('shows the course to the left when the aircraft is right of it', () => {
    const nav = navGeometry(at({ x: 0.5 }))
    expect(nav.xtk).toBeCloseTo(0.5)
    expect(nav.gpsDots).toBeLessThan(0)
  })

  it('follows the runway carried in the state', () => {
    const runway = { ...DEFAULT_RUNWAY, course: 90, elevation: 0 }
    // Five miles west of an eastbound runway is on its final approach course.
    const nav = navGeometry(at({ runway, x: -5, y: 0, heading: 90 }))
    expect(nav.course).toBe(90)
    expect(nav.distToThreshold).toBeCloseTo(5)
    expect(nav.xtk).toBeCloseTo(0)
  })
})

describe('integration step', () => {
  const still = { ...at({ x: 0, y: 0, altitude: DEFAULT_RUNWAY.elevation, airspeed: 0 }), bank: 0, pitch: 0, rpm: 700 }
  const hands = { roll: 0, pitch: 0 }

  it('never sinks below the runway', () => {
    const s = stepAircraft({ ...still, airspeed: 80, pitch: -10, rpm: 2000 }, 0.05, null, hands)
    expect(s.altitude).toBe(DEFAULT_RUNWAY.elevation)
    expect(s.vs).toBe(0)
  })

  it('starts rolling from a standstill at modest power', () => {
    let s = { ...still, rpm: 1500 }
    for (let i = 0; i < 200; i++) s = stepAircraft(s, 0.05, null, hands)
    expect(s.airspeed).toBeGreaterThan(15)
  })

  it('brakes to a stop at idle', () => {
    let s = { ...still, airspeed: 50 }
    for (let i = 0; i < 400; i++) s = stepAircraft(s, 0.05, null, hands)
    expect(s.airspeed).toBe(0)
  })
})
