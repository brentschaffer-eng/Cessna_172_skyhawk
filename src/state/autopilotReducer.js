/**
 * GFC 700 mode logic. The teaching point is that pressing a button does not always
 * make a mode active — lateral navigation and approach modes *arm* first and only
 * capture when the course comes alive, which is why armed and active are separate.
 */

export const INITIAL_AP_STATE = {
  fd: false,
  ap: false,
  lateralActive: 'ROL',
  lateralArmed: null, // 'NAV' | 'APR'
  verticalActive: 'PIT',
  armedGs: false,
  armedAlts: false,
  capturedAltitude: null,
  selectedAltitude: 5000,
  currentAltitude: 3200,
  vsTarget: 500,
  flcTarget: 90,
}

const LATERAL_ANNUNCIATION = { ROL: 'ROL', HDG: 'HDG', NAV: 'GPS', APR: 'LOC' }

/** What the PFD annunciator bar should read, given the current state. */
export function annunciations(state) {
  const armed = []
  if (state.lateralArmed) armed.push(LATERAL_ANNUNCIATION[state.lateralArmed])

  const verticalArmed = []
  if (state.armedGs) verticalArmed.push('GS')
  if (state.armedAlts) verticalArmed.push('ALTS')

  let vertical = state.verticalActive
  if (vertical === 'ALT' && state.capturedAltitude != null) {
    vertical = `ALT ${state.capturedAltitude}FT`
  } else if (vertical === 'VS') {
    vertical = `VS ${state.vsTarget}FPM`
  } else if (vertical === 'FLC') {
    vertical = `FLC ${state.flcTarget}KT`
  }

  return {
    ap: state.ap,
    fd: state.fd,
    lateralActive: LATERAL_ANNUNCIATION[state.lateralActive],
    lateralArmed: armed,
    verticalActive: vertical,
    verticalArmed,
  }
}

/** True when there is something armed that a simulated intercept could capture. */
export function hasPendingCapture(state) {
  return Boolean(state.lateralArmed) || state.armedGs || state.armedAlts
}

function roundAltitude(ft) {
  return Math.round(ft / 100) * 100
}

export function autopilotReducer(state, action) {
  switch (action.type) {
    case 'press':
      return press(state, action.id)
    case 'capture':
      return capture(state)
    case 'setSelectedAltitude':
      return { ...state, selectedAltitude: action.value }
    case 'reset':
      return INITIAL_AP_STATE
    default:
      return state
  }
}

function press(state, id) {
  switch (id) {
    case 'FD': {
      if (state.ap) return state // The servos need guidance; FD cannot be dropped under the AP.
      if (state.fd) {
        return { ...INITIAL_AP_STATE, selectedAltitude: state.selectedAltitude, currentAltitude: state.currentAltitude }
      }
      return { ...state, fd: true }
    }

    case 'AP':
      // Engaging always brings the flight director with it.
      return state.ap ? { ...state, ap: false } : { ...state, ap: true, fd: true }

    case 'HDG': {
      const next = withDirector(state)
      return { ...next, lateralActive: next.lateralActive === 'HDG' ? 'ROL' : 'HDG' }
    }

    case 'NAV': {
      const next = withDirector(state)
      if (next.lateralArmed === 'NAV' || next.lateralActive === 'NAV') {
        return { ...next, lateralArmed: null, lateralActive: 'ROL' }
      }
      return { ...next, lateralArmed: 'NAV', armedGs: false }
    }

    case 'APR': {
      const next = withDirector(state)
      if (next.lateralArmed === 'APR' || next.lateralActive === 'APR') {
        return { ...next, lateralArmed: null, lateralActive: 'ROL', armedGs: false }
      }
      // One press arms both axes: lateral course and the glideslope.
      return { ...next, lateralArmed: 'APR', armedGs: true }
    }

    case 'ALT': {
      const next = withDirector(state)
      return {
        ...next,
        verticalActive: 'ALT',
        capturedAltitude: roundAltitude(next.currentAltitude),
        armedAlts: false,
      }
    }

    case 'VS':
    case 'FLC': {
      const next = withDirector(state)
      return {
        ...next,
        verticalActive: id,
        capturedAltitude: null,
        armedAlts: next.selectedAltitude !== roundAltitude(next.currentAltitude),
      }
    }

    default:
      return state
  }
}

/** Selecting any mode turns the flight director on, exactly as the real unit does. */
function withDirector(state) {
  return state.fd ? state : { ...state, fd: true }
}

function capture(state) {
  let next = { ...state }

  if (next.lateralArmed) {
    next.lateralActive = next.lateralArmed
    next.lateralArmed = null
    return next
  }

  // The glideslope only captures once the lateral course is already being tracked.
  if (next.armedGs && next.lateralActive === 'APR') {
    next.verticalActive = 'GS'
    next.armedGs = false
    next.armedAlts = false
    return next
  }

  if (next.armedAlts) {
    next.verticalActive = 'ALT'
    next.capturedAltitude = next.selectedAltitude
    next.currentAltitude = next.selectedAltitude
    next.armedAlts = false
    return next
  }

  return next
}
