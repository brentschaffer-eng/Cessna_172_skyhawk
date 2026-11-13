/**
 * GFC 700 mode logic plus the simulated airplane it flies.
 *
 * Pressing a button does not always make a mode active: lateral navigation and approach
 * modes *arm* first and only capture when the course comes alive, and ALTS only captures
 * as you approach the preselected altitude. All of that happens as the Skyhawk flies.
 *
 * The reducer is pure: everything it needs, including the runway in use, is in the state.
 */

import {
  DEFAULT_RUNWAY,
  VR,
  clamp,
  flightDirectorCommand,
  glideslopeCaptureReady,
  lateralCaptureReady,
  navGeometry,
  pitchReference,
  rollReference,
  stepAircraft,
  wrap360,
} from '../sim/flightModel.js'

const FLASH_SECONDS = 10
const AP_DISCONNECT_ALERT_SECONDS = 5
const SUB_STEP = 0.05
const ROTATE_PITCH = 8
const ROTATE_RATE = 4 // °/s, as fast as the pilot can pull the nose up.
const HARD_LANDING_FPM = -500
const NO_INPUT = { roll: 0, pitch: 0 }

/** Ready for takeoff on Runway 36. */
export const INITIAL_AP_STATE = {
  // AFCS
  fd: false,
  ap: false,
  lateralActive: 'ROL', // 'ROL' | 'HDG' | 'NAV' | 'APR'
  lateralArmed: null, // 'NAV' | 'APR'
  verticalActive: 'PIT', // 'PIT' | 'VS' | 'FLC' | 'ALT' | 'ALTS' | 'GS'
  armedGs: false,
  armedAlts: false,
  altRef: null,
  vsRef: 0,
  flcRef: 90,
  pitchRef: 2.5,
  rollRef: 0,
  selectedAltitude: 3000,
  headingBug: 360,
  apDisconnectAlert: 0,
  flashLateral: 0,
  flashVertical: 0,
  fdCommand: null,

  // Airframe
  runway: DEFAULT_RUNWAY,
  flapsDown: false,
  x: 0,
  y: 0,
  heading: 360,
  bank: 0,
  pitch: 0,
  altitude: 3557,
  airspeed: 0,
  airspeedTrend: 0,
  vs: 0,
  turnRate: 0,
  rpm: 700,
  // The flaps-down takeoff assist engages the AP once per flight; hand-flying or disconnecting cancels it.
  autoEngageArmed: true,

  // Session
  elapsed: 0,
  message: null,
  minimumsCalled: false,
}

const LATERAL_ANNUNCIATION = { ROL: 'ROL', HDG: 'HDG', NAV: 'GPS', APR: 'LOC' }

/** What the PFD's AFCS status box should read, given the current state. */
export function annunciations(state) {
  const verticalArmed = []
  if (state.fd && state.armedAlts) verticalArmed.push('ALTS')
  if (state.fd && state.armedGs) verticalArmed.push('GS')

  let reference = ''
  if (state.verticalActive === 'VS') {
    reference = `${state.vsRef >= 0 ? '↑' : '↓'}${Math.abs(state.vsRef)}FPM`
  } else if (state.verticalActive === 'FLC') {
    reference = `${state.flcRef}KT`
  } else if (state.verticalActive === 'ALT' || state.verticalActive === 'ALTS') {
    reference = `${state.altRef}FT`
  }

  return {
    ap: state.ap,
    apAlert: !state.ap && state.apDisconnectAlert > 0,
    // The disconnect annunciation flashes twice a second, timed off the alert's own countdown.
    apAlertBlink: Math.floor(state.apDisconnectAlert * 4) % 2 === 0,
    fd: state.fd,
    lateralActive: state.fd ? LATERAL_ANNUNCIATION[state.lateralActive] : '',
    lateralArmed: state.fd && state.lateralArmed ? LATERAL_ANNUNCIATION[state.lateralArmed] : '',
    verticalActive: state.fd ? state.verticalActive : '',
    reference: state.fd ? reference : '',
    verticalArmed: verticalArmed.join(' '),
    flashLateral: state.flashLateral > 0,
    flashVertical: state.flashVertical > 0,
  }
}

/** CDI source follows the approach: LOC once APR is armed, otherwise the GPS flight plan. */
export function cdiSource(state) {
  return state.lateralArmed === 'APR' || state.lateralActive === 'APR' ? 'LOC1' : 'GPS'
}

export function autopilotReducer(state, action) {
  switch (action.type) {
    case 'press':
      return press(state, action.id)
    case 'disconnect':
      return disconnect(state)
    case 'headingBug':
      return { ...state, headingBug: wrap360(Math.round(state.headingBug + action.delta)) }
    case 'headingSync':
      return { ...state, headingBug: wrap360(Math.round(state.heading)) }
    case 'selectedAltitude':
      return setSelectedAltitude(state, clamp(state.selectedAltitude + action.delta, 0, 14000))
    case 'rpm':
      return { ...state, rpm: clamp(Math.round(action.value), 700, 2700) }
    case 'dismissMessage':
      return { ...state, message: null }
    case 'tick':
      return tick(state, action.dt, action.pilot, action.flapsDown)
    case 'teleport': {
      const heading = action.heading ?? INITIAL_AP_STATE.heading
      const runway = action.runway ?? state.runway
      return {
        ...INITIAL_AP_STATE,
        runway,
        flapsDown: state.flapsDown,
        altitude: action.altitude ?? runway.elevation,
        selectedAltitude: action.selectedAltitude ?? INITIAL_AP_STATE.selectedAltitude,
        heading,
        headingBug: wrap360(Math.round(heading)),
        x: action.x ?? 0,
        y: action.y ?? 0,
      }
    }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Key presses
// ---------------------------------------------------------------------------

/** Selecting any mode with the FD off brings it up in ROL and PIT, synced to the current attitude. */
function withDirector(state) {
  if (state.fd) return state
  return {
    ...state,
    fd: true,
    lateralActive: 'ROL',
    lateralArmed: null,
    verticalActive: 'PIT',
    armedGs: false,
    rollRef: rollReference(state.bank),
    pitchRef: pitchReference(state.pitch),
  }
}

function toRoll(state) {
  return { ...state, lateralActive: 'ROL', rollRef: rollReference(state.bank), flashLateral: 0 }
}

function toPitch(state) {
  return { ...state, verticalActive: 'PIT', pitchRef: pitchReference(state.pitch), flashVertical: 0 }
}

/** Leaving the approach on the lateral axis also drops the glideslope, armed or captured. */
function cancelApproach(state) {
  let next = { ...state, armedGs: false }
  if (next.lateralArmed === 'APR') next.lateralArmed = null
  if (next.verticalActive === 'GS') next = toPitch(next)
  return next
}

function disconnect(state) {
  if (!state.ap) return state
  return { ...state, ap: false, apDisconnectAlert: AP_DISCONNECT_ALERT_SECONDS, autoEngageArmed: false }
}

function press(state, id) {
  switch (id) {
    case 'AP':
      if (state.ap) return disconnect(state)
      return { ...withDirector(state), ap: true, apDisconnectAlert: 0 }

    case 'FD':
      if (state.ap) return state // The servos need guidance; FD cannot be dropped under the AP.
      if (state.fd) {
        return {
          ...state,
          fd: false,
          lateralActive: 'ROL',
          lateralArmed: null,
          verticalActive: 'PIT',
          armedGs: false,
          armedAlts: false,
          fdCommand: null,
        }
      }
      return withDirector(state)

    case 'HDG': {
      const next = withDirector(state)
      if (next.lateralActive === 'HDG') return toRoll(next)
      const leaving = next.lateralActive === 'APR' ? cancelApproach(next) : next
      return { ...leaving, lateralActive: 'HDG', flashLateral: 0 }
    }

    case 'NAV': {
      const next = withDirector(state)
      if (next.lateralActive === 'NAV') return toRoll(next)
      if (next.lateralArmed === 'NAV') return { ...next, lateralArmed: null }
      const leaving = next.lateralActive === 'APR' ? toRoll(cancelApproach(next)) : cancelApproach(next)
      return { ...leaving, lateralArmed: 'NAV' }
    }

    case 'APR': {
      const next = withDirector(state)
      if (next.lateralActive === 'APR') return toRoll(cancelApproach(next))
      if (next.lateralArmed === 'APR') return { ...next, lateralArmed: null, armedGs: false }
      // One press arms both axes: the localizer and the glideslope.
      return { ...next, lateralArmed: 'APR', armedGs: true }
    }

    case 'ALT': {
      const next = withDirector(state)
      if (next.verticalActive === 'ALT') return toPitch(next)
      return {
        ...next,
        verticalActive: 'ALT',
        altRef: Math.round(next.altitude / 10) * 10, // Where you are now, not the preselect.
        armedAlts: false,
        armedGs: next.verticalActive === 'GS' ? false : next.armedGs,
        flashVertical: 0,
      }
    }

    case 'VS': {
      const next = withDirector(state)
      if (next.verticalActive === 'VS') return toPitch(next)
      return {
        ...next,
        verticalActive: 'VS',
        vsRef: clamp(Math.round(next.vs / 100) * 100, -1500, 1500), // Syncs to the current rate.
        armedGs: next.verticalActive === 'GS' ? false : next.armedGs,
        flashVertical: 0,
      }
    }

    case 'FLC': {
      const next = withDirector(state)
      if (next.verticalActive === 'FLC') return toPitch(next)
      return {
        ...next,
        verticalActive: 'FLC',
        flcRef: clamp(Math.round(next.airspeed), 60, 140), // Syncs to the current airspeed.
        armedGs: next.verticalActive === 'GS' ? false : next.armedGs,
        flashVertical: 0,
      }
    }

    case 'UP':
    case 'DN':
      return nudge(state, id === 'UP' ? 1 : -1)

    default:
      // VNV and BC are on the bezel for completeness but have nothing to fly in this scenario.
      return state
  }
}

/** NOSE UP / NOSE DN adjust whichever reference the active vertical mode is holding. */
function nudge(state, dir) {
  if (!state.fd) return state
  switch (state.verticalActive) {
    case 'PIT':
      return { ...state, pitchRef: clamp(state.pitchRef + 0.5 * dir, -15, 20) }
    case 'VS':
      return { ...state, vsRef: clamp(state.vsRef + 100 * dir, -1500, 1500) }
    case 'FLC':
      // Nose up means slower: the airplane pitches up to bleed speed.
      return { ...state, flcRef: clamp(state.flcRef - dir, 60, 140) }
    case 'ALT':
      return { ...state, altRef: state.altRef + 10 * dir }
    default:
      return state
  }
}

/** Moving the preselect mid-capture abandons the capture and reverts to PIT, as the real unit does. */
function setSelectedAltitude(state, value) {
  const next = { ...state, selectedAltitude: value }
  if (state.fd && state.verticalActive === 'ALTS') return toPitch(next)
  return next
}

// ---------------------------------------------------------------------------
// Simulation tick
// ---------------------------------------------------------------------------

function captures(s, nav) {
  let next = s

  // ALTS arms whenever a climb or descent mode is flying and the preselect differs.
  const altsEligible = next.fd && ['PIT', 'VS', 'FLC'].includes(next.verticalActive)
  const armedAlts = altsEligible && Math.abs(next.selectedAltitude - next.altitude) > 50
  if (armedAlts !== next.armedAlts) next = { ...next, armedAlts }

  if (next.armedAlts) {
    const toGo = next.selectedAltitude - next.altitude
    const band = Math.max(50, Math.abs(next.vs) / 4)
    if (toGo * next.vs > 0 && Math.abs(toGo) <= band) {
      next = {
        ...next,
        verticalActive: 'ALTS',
        altRef: next.selectedAltitude,
        armedAlts: false,
        flashVertical: FLASH_SECONDS,
      }
    }
  }

  if (next.verticalActive === 'ALTS' && Math.abs(next.altRef - next.altitude) < 15) {
    next = { ...next, verticalActive: 'ALT', flashVertical: FLASH_SECONDS }
  }

  if (next.fd && next.lateralArmed && lateralCaptureReady(next, nav, next.lateralArmed)) {
    next = { ...next, lateralActive: next.lateralArmed, lateralArmed: null, flashLateral: FLASH_SECONDS }
  }

  // The glideslope only captures once the localizer is already being tracked.
  if (next.fd && next.armedGs && next.lateralActive === 'APR' && glideslopeCaptureReady(nav)) {
    next = {
      ...next,
      verticalActive: 'GS',
      armedGs: false,
      armedAlts: false,
      flashVertical: FLASH_SECONDS,
    }
  }

  return next
}

/**
 * Takeoff assist. With the flaps down and hands off, the airplane rotates itself at Vr and the
 * autopilot takes over once it is climbing away. With the flaps up it stays on the runway until
 * the pilot pulls back. Any pilot input, or disconnecting the AP, hands the flight back for good:
 * the assist only re-arms when the airplane is put back on the runway.
 */
function takeoffAssist(s, dt, pilot) {
  if (!s.autoEngageArmed) return s
  if (pilot.pitch !== 0 || pilot.roll !== 0) return { ...s, autoEngageArmed: false }

  if (s.altitude <= s.runway.elevation) {
    if (!s.flapsDown || s.airspeed < VR) return s
    return { ...s, pitch: Math.min(s.pitch + ROTATE_RATE * dt, ROTATE_PITCH) }
  }
  if (!s.ap && s.altitude > s.runway.elevation + 20 && s.vs > 100 && s.airspeed > VR) {
    return {
      ...s,
      ap: true,
      fd: true,
      lateralActive: 'HDG',
      lateralArmed: null,
      verticalActive: 'VS',
      vsRef: 500,
      armedGs: false,
      autoEngageArmed: false,
    }
  }
  return s
}

function tick(state, realDt, pilot = NO_INPUT, flapsDown = state.flapsDown) {
  if (state.message) return state

  const scaled = Math.min(realDt, 0.1)
  let s = state.flapsDown === flapsDown ? state : { ...state, flapsDown }
  let remaining = scaled
  let lastCmd = s.fdCommand
  let impactVs = 0

  while (remaining > 1e-6) {
    const dt = Math.min(SUB_STEP, remaining)
    remaining -= dt
    const nav = navGeometry(s)
    s = captures(s, nav)
    s = takeoffAssist(s, dt, pilot)

    lastCmd = flightDirectorCommand(s, nav)
    const wasAirborne = s.altitude > s.runway.elevation
    s = stepAircraft(s, dt, lastCmd, pilot)
    if (wasAirborne && s.altitude <= s.runway.elevation) impactVs = Math.min(impactVs, s.vs)
  }

  s = {
    ...s,
    fdCommand: lastCmd,
    elapsed: s.elapsed + scaled,
    apDisconnectAlert: Math.max(0, s.apDisconnectAlert - scaled),
    flashLateral: Math.max(0, s.flashLateral - scaled),
    flashVertical: Math.max(0, s.flashVertical - scaled),
  }

  const agl = s.altitude - s.runway.elevation
  // Announced once, so dismissing it lets the pilot carry on and land by hand.
  if (s.fd && s.verticalActive === 'GS' && agl <= 200 && !s.minimumsCalled) {
    return {
      ...disconnect(s),
      minimumsCalled: true,
      message: {
        tone: 'success',
        title: 'Minimums — 200 ft',
        body: 'The ILS is flown. The GFC 700 must be disconnected by 200 ft AGL on an approach; from here you land by hand. Continue to fly the landing yourself, or reset to fly the approach again.',
      },
    }
  }
  if (impactVs < HARD_LANDING_FPM) {
    return {
      ...disconnect(s),
      message: {
        tone: 'danger',
        title: 'Terrain',
        body: 'The airplane descended into the ground. The autopilot flies exactly what it is told — check the vertical mode and the preselected altitude.',
      },
    }
  }

  return s
}
