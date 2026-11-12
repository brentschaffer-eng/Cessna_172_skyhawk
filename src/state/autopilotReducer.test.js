import { describe, expect, it } from 'vitest'
import { AIRBORNE_SCENARIO, INITIAL_AP_STATE, autopilotReducer } from './autopilotReducer.js'

const FRAME = 1 / 60
const HANDS_OFF = { roll: 0, pitch: 0 }

function fly(state, seconds, { pilot = HANDS_OFF, flapsDown = false, until } = {}) {
  let s = state
  for (let i = 0; i < seconds * 60; i++) {
    s = autopilotReducer(s, { type: 'tick', dt: FRAME, pilot, flapsDown })
    if (until?.(s)) break
  }
  return s
}

const act = (state, ...actions) => actions.reduce(autopilotReducer, state)
const press = (id) => ({ type: 'press', id })
const throttle = (value) => ({ type: 'rpm', value })

/** Recursively freezes a state so any in-place write by the reducer throws. */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

describe('ground roll and takeoff', () => {
  it('stays put at idle', () => {
    const s = fly(INITIAL_AP_STATE, 20)
    expect(s.airspeed).toBe(0)
    expect(s.altitude).toBe(INITIAL_AP_STATE.runway.elevation)
  })

  it('taxis at low power without flying', () => {
    const s = fly(act(INITIAL_AP_STATE, throttle(1200)), 60)
    expect(s.airspeed).toBeGreaterThan(5)
    expect(s.airspeed).toBeLessThan(45)
    expect(s.altitude).toBe(INITIAL_AP_STATE.runway.elevation)
  })

  it('accelerates at partial power', () => {
    const s = fly(act(INITIAL_AP_STATE, throttle(2000)), 30)
    expect(s.airspeed).toBeGreaterThan(40)
  })

  it('takes off at full power and hands over to the autopilot', () => {
    const s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60)
    expect(s.altitude).toBeGreaterThan(INITIAL_AP_STATE.runway.elevation + 100)
    expect(s).toMatchObject({ ap: true, fd: true, lateralActive: 'HDG', verticalActive: 'VS', vsRef: 500 })
  })

  it('takes a believable time to reach rotation speed', () => {
    const s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60, { until: (x) => x.airspeed > 65 })
    expect(s.elapsed).toBeGreaterThan(12)
    expect(s.elapsed).toBeLessThan(35)
  })

  it('takes off with the flaps down too', () => {
    const s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60, { flapsDown: true })
    expect(s.flapsDown).toBe(true)
    expect(s.altitude).toBeGreaterThan(INITIAL_AP_STATE.runway.elevation + 100)
  })

  it('can be rotated by hand, which cancels the automatic AP engagement', () => {
    let s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60, { until: (x) => x.airspeed > 60 })
    s = fly(s, 3, { pilot: { roll: 0, pitch: 1 } })
    s = fly(s, 20)
    expect(s.altitude).toBeGreaterThan(INITIAL_AP_STATE.runway.elevation + 50)
    expect(s.ap).toBe(false)
  })
})

describe('autopilot engagement', () => {
  it('stays disconnected in a climb once the pilot disconnects it', () => {
    let s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60)
    expect(s.ap).toBe(true)
    s = fly(act(s, { type: 'disconnect' }), 10)
    expect(s.ap).toBe(false)
    expect(s.vs).toBeGreaterThan(100) // Still climbing: the condition that used to re-engage it.
  })

  it('re-arms the takeoff assist when the airplane is put back on the runway', () => {
    let s = fly(act(INITIAL_AP_STATE, throttle(2700)), 60)
    s = act(s, { type: 'disconnect' }, { type: 'teleport' })
    expect(s.autoEngageArmed).toBe(true)
    expect(s.altitude).toBe(s.runway.elevation)
  })
})

describe('purity', () => {
  it('never writes to the state it was given', () => {
    let s = deepFreeze(act(INITIAL_AP_STATE, throttle(2700)))
    // Through rotation, lift-off and automatic AP engagement, where the old code mutated.
    for (let i = 0; i < 45 * 60; i++) {
      s = deepFreeze(autopilotReducer(s, { type: 'tick', dt: FRAME, pilot: HANDS_OFF, flapsDown: false }))
    }
    expect(s.ap).toBe(true)
  })

  it('carries the runway in state through a teleport', () => {
    const runway = { id: 'RW08R', x: 0, y: 0, course: 100, elevation: 14 }
    const s = act(INITIAL_AP_STATE, { type: 'teleport', runway, heading: 100, selectedAltitude: 2500 })
    expect(s.runway).toBe(runway)
    expect(s).toMatchObject({ altitude: 14, heading: 100, headingBug: 100, selectedAltitude: 2500 })
    expect(INITIAL_AP_STATE.runway.elevation).toBe(3557)
  })
})

describe('ILS approach from the tutor scenario', () => {
  const established = () =>
    act(AIRBORNE_SCENARIO, press('AP'), press('HDG'), press('ALT'), press('APR'), throttle(1900))

  it('arms, then captures the localizer and the glideslope', () => {
    let s = established()
    expect(s).toMatchObject({ lateralActive: 'HDG', lateralArmed: 'APR', armedGs: true, verticalActive: 'ALT' })
    s = fly(s, 400, { until: (x) => x.verticalActive === 'GS' })
    expect(s).toMatchObject({ lateralActive: 'APR', verticalActive: 'GS', ap: true })
  })

  it('announces minimums once, then lets the flight continue', () => {
    let s = fly(established(), 900, { until: (x) => x.message })
    expect(s.message.title).toMatch(/Minimums/)
    expect(s.ap).toBe(false)
    expect(s.altitude - s.runway.elevation).toBeLessThanOrEqual(200)

    // Frozen while the message is up.
    expect(fly(s, 1)).toBe(s)

    s = act(s, { type: 'dismissMessage' })
    const later = fly(s, 2)
    expect(later.message).toBeNull()
    expect(later.elapsed).toBeGreaterThan(s.elapsed)
  })

  it('reports flying into the ground', () => {
    let s = fly(established(), 900, { until: (x) => x.message })
    s = fly(act(s, { type: 'dismissMessage' }), 120, { until: (x) => x.message })
    expect(s.message.title).toBe('Terrain')
    // Dismissing it leaves the airplane stopped on the ground rather than re-alerting.
    s = fly(act(s, { type: 'dismissMessage' }), 5)
    expect(s.message).toBeNull()
    expect(s.altitude).toBe(s.runway.elevation)
  })
})

describe('mode logic', () => {
  it('captures the preselected altitude', () => {
    let s = act(AIRBORNE_SCENARIO, press('AP'), { type: 'selectedAltitude', delta: 500 }, press('VS'))
    s = act(s, press('UP'), press('UP'), press('UP'), press('UP'), press('UP'), throttle(2700))
    expect(s.vsRef).toBe(500)
    s = fly(s, 200, { until: (x) => x.verticalActive === 'ALT' })
    expect(s.verticalActive).toBe('ALT')
    expect(s.altRef).toBe(6500)
    expect(Math.abs(s.altitude - 6500)).toBeLessThan(20)
  })

  it('will not drop the flight director while the autopilot is engaged', () => {
    const s = act(AIRBORNE_SCENARIO, press('AP'), press('FD'))
    expect(s.fd).toBe(true)
  })
})
