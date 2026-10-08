/**
 * A deliberately small point-mass model of a Cessna 172S plus the GFC 700 control laws.
 *
 * It is not a certified flight model. It is tuned so the numbers a student sees are
 * believable: ~100 KIAS level at 2100 RPM, ~700 fpm at Vy with full power, ~700 fpm down
 * at idle, standard-rate turns at ~15° of bank. That is enough for the autopilot modes to
 * behave like the real thing: VS will happily trade away airspeed, FLC climbs only as fast
 * as the power allows, and ALT holds altitude with pitch while the speed does what it likes.
 *
 * Units: knots, feet, feet per minute, degrees, nautical miles, seconds.
 */

export const KT_TO_FPM = 101.27
const NM_FT = 6076.12

/** Runway 36 threshold sits at the origin; the ILS and the GPS final leg share the 360° course. */
export const RUNWAY = { id: 'RW36', x: 0, y: 0, course: 360, elevation: 3557 }
export const GS_ANGLE = 3
const TCH_FT = 50
const LOC_ANTENNA_BEYOND_NM = 1.2 // Localizer antenna sits past the far end of the runway.
export const GPS_FULL_SCALE_NM = 1.0 // TERM sensitivity.
export const LOC_FULL_SCALE_DEG = 2.5
export const GS_FULL_SCALE_DEG = 0.7

export const PITCH_LIMIT_UP = 20
export const PITCH_LIMIT_DN = -15
const ROL_BANK_LIMIT = 22
const HDG_BANK_LIMIT = 20
const ALT_GAIN = 4 // fpm commanded per foot of altitude error.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI
export const wrap360 = (h) => ((h % 360) + 360) % 360
/** Signed shortest turn from `current` to `target`, in the range [-180, 180). */
export const angleDiff = (target, current) => ((((target - current) % 360) + 540) % 360) - 180

// ---------------------------------------------------------------------------
// Aircraft performance
// ---------------------------------------------------------------------------

/** Fraction of maximum power for an RPM, fixed-pitch prop. Idle is effectively zero thrust. */
export function enginePower(rpm) {
  return clamp((rpm - 1000) / 1700, 0, 1)
}

const POWER_AVAILABLE_FPM = 1443

/** Power required to hold level flight, expressed as an equivalent climb rate. */
function powerRequiredFpm(v, bank) {
  const s = Math.max(v, 35) / 100
  const level = 572 * s ** 3 + 354 / s
  // Induced drag goes up with load factor in a turn.
  return level * (1 + 0.6 * (1 / Math.cos(rad(bank)) - 1))
}

/** Climb rate available if all excess power went into altitude at this speed. */
export function excessFpm(v, rpm, bank = 0) {
  return POWER_AVAILABLE_FPM * enginePower(rpm) - powerRequiredFpm(v, bank)
}

/** Angle of attack needed at a given airspeed; pitch = flight path + AoA. */
export function alphaDeg(v) {
  return 2.5 * (100 / Math.max(v, 40)) ** 2
}

/** The pitch attitude that produces a given vertical speed at the current airspeed. */
export function pitchForVs(vs, v) {
  const sinGamma = clamp(vs / (Math.max(v, 40) * KT_TO_FPM), -0.35, 0.35)
  return deg(Math.asin(sinGamma)) + alphaDeg(v)
}

export function standardRateBank(v) {
  return deg(Math.atan((3 * v) / 1091))
}

// ---------------------------------------------------------------------------
// Navigation geometry
// ---------------------------------------------------------------------------

/** Glideslope altitude (ft above field) at a distance from the threshold. */
export function glideslopeAltitude(distNm) {
  return distNm * NM_FT * Math.tan(rad(GS_ANGLE)) + TCH_FT
}

/**
 * Everything the HSI, CDI and capture logic need, derived from position.
 * Needle values are in dots, ±2 is full scale. A positive lateral needle means the
 * course is to the right; a positive GS value means the glideslope is above you.
 */
export function navGeometry(s) {
  const c = rad(RUNWAY.course)
  const dx = s.x - RUNWAY.x
  const dy = s.y - RUNWAY.y
  const ux = Math.sin(c)
  const uy = Math.cos(c)
  const along = dx * ux + dy * uy
  const xtk = dx * uy - dy * ux // + = right of course
  const distToThreshold = -along

  const locDist = Math.max(distToThreshold + LOC_ANTENNA_BEYOND_NM, 0.05)
  const locDevDeg = deg(Math.atan2(xtk, locDist))

  const aboveField = s.altitude - RUNWAY.elevation
  const gsAngle = deg(Math.atan2(aboveField - TCH_FT, Math.max(distToThreshold, 0.05) * NM_FT))
  const gsDevDeg = GS_ANGLE - gsAngle // + = glideslope above aircraft

  // Closing rate on the course (nm per second), negative when converging.
  const trackErr = angleDiff(s.heading, RUNWAY.course)
  const xtkRate = (s.airspeed / 3600) * Math.sin(rad(trackErr))

  return {
    xtk,
    xtkRate,
    distToThreshold,
    gpsDots: clamp((-xtk / GPS_FULL_SCALE_NM) * 2, -2.4, 2.4),
    locDots: clamp((-locDevDeg / LOC_FULL_SCALE_DEG) * 2, -2.4, 2.4),
    locDevDeg,
    gsDots: clamp((gsDevDeg / GS_FULL_SCALE_DEG) * 2, -2.4, 2.4),
    gsDevDeg,
    glideslopeAlt: glideslopeAltitude(Math.max(distToThreshold, 0)) + RUNWAY.elevation,
    bearingToRunway: wrap360(deg(Math.atan2(-dx, -dy))),
  }
}

/** Distance before the course at which a turn onto it must start (turn anticipation). */
function captureLead(s) {
  const turnRadiusNm = (s.airspeed ** 2 / (11.26 * Math.tan(rad(HDG_BANK_LIMIT)))) / NM_FT
  const intercept = Math.min(Math.abs(angleDiff(s.heading, RUNWAY.course)), 90)
  return turnRadiusNm * (1 - Math.cos(rad(intercept))) + 0.05
}

/** True when an armed lateral mode should capture the course this instant. */
export function lateralCaptureReady(s, nav, mode) {
  const dots = mode === 'APR' ? nav.locDots : nav.gpsDots
  if (Math.abs(dots) >= 2) return false // Needle pegged: course is not alive yet.
  if (mode === 'APR' && nav.distToThreshold < 0.3) return false
  if (Math.abs(nav.xtk) < 0.03) return true
  const converging = nav.xtk * nav.xtkRate < 0
  return converging && Math.abs(nav.xtk) <= captureLead(s)
}

/** Glideslope capture: as the needle centres from below, or within a dot above. */
export function glideslopeCaptureReady(nav) {
  return nav.distToThreshold > 0.3 && nav.gsDevDeg <= 0.03 && nav.gsDevDeg >= -0.35
}

// ---------------------------------------------------------------------------
// GFC 700 control laws: modes in, flight director pitch and bank out
// ---------------------------------------------------------------------------

function bankForHeading(target, s) {
  const limit = Math.min(HDG_BANK_LIMIT, standardRateBank(s.airspeed) + 3)
  return clamp(angleDiff(target, s.heading) * 2, -limit, limit)
}

function headingForCourse(nav) {
  // Proportional intercept: 30° cut when well off, shallowing as the needle centres.
  return wrap360(RUNWAY.course - clamp(nav.xtk * 60, -30, 30))
}

function altitudeHoldVs(s) {
  return clamp((s.altRef - s.altitude) * ALT_GAIN, -800, 800)
}

/** FLC: pitch for whatever climb or descent rate keeps the reference airspeed. */
function flcVs(s) {
  const v = s.airspeed
  const wantAccel = (s.flcRef - v) * 0.15 // kt/s
  let vs = excessFpm(v, s.rpm, s.bank) - (wantAccel * v) / 0.1882
  // FLC never climbs away from a lower selected altitude or descends away from a higher one.
  if (s.selectedAltitude < s.altitude) vs = Math.min(vs, 0)
  else vs = Math.max(vs, 0)
  return clamp(vs, -2000, 1500)
}

function glideslopeVs(s, nav) {
  const pathVs = -s.airspeed * KT_TO_FPM * Math.sin(rad(GS_ANGLE))
  return clamp(pathVs + (nav.glideslopeAlt - s.altitude) * ALT_GAIN, -1500, 500)
}

/** Pitch and bank the flight director is asking for, or null when the FD is off. */
export function flightDirectorCommand(s, nav) {
  if (!s.fd) return null

  let bank
  switch (s.lateralActive) {
    case 'HDG':
      bank = bankForHeading(s.headingBug, s)
      break
    case 'NAV':
    case 'APR':
      bank = bankForHeading(headingForCourse(nav), s)
      break
    default:
      bank = s.rollRef
  }

  let pitch
  switch (s.verticalActive) {
    case 'VS':
      pitch = pitchForVs(s.vsRef, s.airspeed)
      break
    case 'FLC':
      pitch = pitchForVs(flcVs(s), s.airspeed)
      break
    case 'ALT':
    case 'ALTS':
      pitch = pitchForVs(altitudeHoldVs(s), s.airspeed)
      break
    case 'GS':
      pitch = pitchForVs(glideslopeVs(s, nav), s.airspeed)
      break
    default:
      pitch = s.pitchRef
  }

  return {
    bank: clamp(bank, -ROL_BANK_LIMIT, ROL_BANK_LIMIT),
    pitch: clamp(pitch, PITCH_LIMIT_DN, PITCH_LIMIT_UP),
  }
}

/** ROL mode: hold the current bank, or roll wings level if it is shallower than 6°. */
export function rollReference(bank) {
  return Math.abs(bank) < 6 ? 0 : clamp(bank, -ROL_BANK_LIMIT, ROL_BANK_LIMIT)
}

export function pitchReference(pitch) {
  return clamp(Math.round(pitch * 2) / 2, PITCH_LIMIT_DN, PITCH_LIMIT_UP)
}

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

/**
 * Advances the airframe by `dt` seconds. With the AP engaged the servos chase the
 * flight director at realistic rates; otherwise the airplane holds its trimmed
 * attitude and responds only to the pilot's input.
 */
export function stepAircraft(s, dt, cmd, pilot) {
  let { bank, pitch } = s

  if (s.ap && cmd) {
    bank += clamp(cmd.bank - bank, -5 * dt, 5 * dt)
    pitch += clamp(cmd.pitch - pitch, -2.5 * dt, 2.5 * dt)
  } else {
    bank += pilot.roll * 20 * dt
    pitch += pilot.pitch * 4 * dt
  }

  const v = s.airspeed
  // Past the critical angle of attack the nose falls through no matter what.
  if (v < 47 && s.altitude > RUNWAY.elevation + 10) pitch -= 8 * dt

  bank = clamp(bank, -60, 60)
  pitch = clamp(pitch, -25, 25)

  const gamma = pitch - alphaDeg(v)
  let vs = v * KT_TO_FPM * Math.sin(rad(gamma))
  
  // Prevent falling through the ground
  if (s.altitude <= RUNWAY.elevation && vs < 0) {
    vs = 0
    pitch = Math.max(pitch, 0)
    bank = 0
  }

  const safeV = Math.max(v, 1)
  // Ground friction when at 0 throttle and on the ground
  const groundDrag = (s.altitude <= RUNWAY.elevation && s.rpm < 1000) ? 20 : 0
  const accel = ((excessFpm(v, s.rpm, bank) - vs) * 0.1882) / safeV - groundDrag
  
  // Allow speed to drop to 0
  const airspeed = clamp(v + accel * dt, 0, 175)
  const turnRate = (1091 * Math.tan(rad(bank))) / safeV
  const heading = wrap360(s.heading + turnRate * dt)
  const groundNmPerSec = v / 3600

  return {
    ...s,
    bank,
    pitch,
    vs,
    airspeed,
    airspeedTrend: accel * 6, // G1000 trend vector: speed in 6 seconds.
    turnRate,
    heading,
    altitude: Math.max(RUNWAY.elevation, s.altitude + (vs / 60) * dt),
    x: s.x + groundNmPerSec * Math.sin(rad(heading)) * dt,
    y: s.y + groundNmPerSec * Math.cos(rad(heading)) * dt,
  }
}
