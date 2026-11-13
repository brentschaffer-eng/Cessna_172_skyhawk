import { describe, expect, it } from 'vitest'
import { AIRPORTS, AIRPORT_GROUPS, DEFAULT_AIRPORT } from './airports.js'

describe('airports', () => {
  it('has unique ids and a Calgary default', () => {
    expect(new Set(AIRPORTS.map((a) => a.id)).size).toBe(AIRPORTS.length)
    expect(DEFAULT_AIRPORT.id).toBe('CYYC')
    expect(AIRPORT_GROUPS.every((g) => g.airports.length > 0)).toBe(true)
  })

  it('places every runway in Canada with a usable true heading', () => {
    for (const a of AIRPORTS) {
      expect(a.lat, a.id).toBeGreaterThan(41)
      expect(a.lat, a.id).toBeLessThan(84)
      expect(a.lon, a.id).toBeGreaterThan(-142)
      expect(a.lon, a.id).toBeLessThan(-52)
      expect(a.runway.heading, a.id).toBeGreaterThan(0)
      expect(a.runway.heading, a.id).toBeLessThanOrEqual(360)
      expect(a.runway.lengthFt, a.id).toBeGreaterThan(5000)
    }
  })

  it('names each runway for its true heading, give or take the magnetic declination', () => {
    for (const a of AIRPORTS) {
      const number = Number.parseInt(a.runway.id, 10) * 10
      const diff = Math.abs(((a.runway.heading - number + 540) % 360) - 180)
      expect(diff, a.id).toBeLessThan(35) // Declination in Canada reaches about 30° in the far north.
    }
  })
})
