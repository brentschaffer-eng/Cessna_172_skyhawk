/**
 * GFC 700 mode logic plus the simulated airplane it flies.
 *
 * The teaching point is that pressing a button does not always make a mode active —
 * lateral navigation and approach modes *arm* first and only capture when the course
 * comes alive, and ALTS only captures as you approach the preselected altitude. All
 * of that now happens on its own as the simulated Skyhawk flies, rather than on a
 * "simulate intercept" button.
 */

import {
  RUNWAY,
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

  // Session
  paused: false,
  simRate: 1,
  elapsed: 0,
  message: null,
  milestones: {},
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
    case 'simRate':
      return { ...state, simRate: action.value, paused: false }
    case 'togglePause':
      return { ...state, paused: !state.paused }
    case 'dismissMessage':
      return { ...state, message: null }
    case 'tick':
      return tick(state, action.dt, action.pilot, action.flapsDown)
    case 'teleport': {
      const heading = action.heading ?? INITIAL_AP_STATE.heading
      return {
        ...INITIAL_AP_STATE,
        altitude: action.altitude,
        heading,
        headingBug: wrap360(Math.round(heading)),
        x: action.x ?? 0,
        y: action.y ?? 0,
      }
    }
    case 'reset':
      return INITIAL_AP_STATE
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
  return { ...state, ap: false, apDisconnectAlert: AP_DISCONNECT_ALERT_SECONDS }
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

function milestones(s) {
  const m = s.milestones
  const want = {
    ap: s.ap,
    hdg: s.fd && s.lateralActive === 'HDG',
    alt: s.fd && s.verticalActive === 'ALT',
    aprArmed: s.fd && (s.lateralArmed === 'APR' || s.lateralActive === 'APR'),
    loc: s.fd && s.lateralActive === 'APR',
    gs: s.fd && s.verticalActive === 'GS',
  }
  let changed = false
  const next = { ...m }
  for (const [k, v] of Object.entries(want)) {
    if (v && !m[k]) {
      next[k] = true
      changed = true
    }
  }
  return changed ? { ...s, milestones: next } : s
}

function tick(state, realDt, pilot, flapsDown) {
  if (state.paused || state.message) return state

  let s = state
  let remaining = Math.min(realDt, 0.1) * state.simRate
  let lastCmd = s.fdCommand

  while (remaining > 1e-6) {
    const dt = Math.min(SUB_STEP, remaining)
    remaining -= dt
    const nav = navGeometry(s)
    s = captures(s, nav)
    
    // Auto-takeoff behavior when flaps are up
    if (!flapsDown && s.altitude <= RUNWAY.elevation && s.airspeed > 65) {
      s.pitch = Math.min(s.pitch + 2 * dt, 7) // Auto pitch up to rotate
    }

    // Auto-engage AP once airborne after an auto-takeoff
    if (!flapsDown && s.altitude > RUNWAY.elevation + 20 && s.vs > 100 && !s.ap && s.airspeed > 65) {
      s.ap = true
      s.fd = true
      s.verticalActive = 'VS'
      s.vsRef = 500
      s.lateralActive = 'HDG'
    }

    lastCmd = flightDirectorCommand(s, nav)
    s = stepAircraft(s, dt, lastCmd, pilot)
  }

  const scaled = Math.min(realDt, 0.1) * state.simRate
  s = {
    ...s,
    fdCommand: lastCmd,
    elapsed: s.elapsed + scaled,
    apDisconnectAlert: Math.max(0, s.apDisconnectAlert - scaled),
    flashLateral: Math.max(0, s.flashLateral - scaled),
    flashVertical: Math.max(0, s.flashVertical - scaled),
  }
  s = milestones(s)

  const agl = s.altitude - RUNWAY.elevation
  if (s.fd && s.verticalActive === 'GS' && agl <= 200) {
    return {
      ...disconnect(s),
      milestones: { ...s.milestones, minimums: true },
      message: {
        tone: 'success',
        title: 'Minimums — 200 ft',
        body: 'The ILS is flown. The GFC 700 must be disconnected by 200 ft AGL on an approach; from here you would land by hand. Reset to fly it again.',
      },
    }
  }
  if (agl <= 0 && s.vs < -500) {
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
