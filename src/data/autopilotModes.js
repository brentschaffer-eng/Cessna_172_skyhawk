/**
 * GFC 700 mode catalogue. `axis` drives both the bezel grouping and the state machine:
 * 'master' buttons toggle the servos/flight director, lateral and vertical buttons
 * compete only against other buttons on the same axis.
 *
 * @typedef {{ heading: string, body: string }} ModeSection
 * @typedef {{
 *   id: string,
 *   label: string,
 *   axis: 'master' | 'lateral' | 'vertical',
 *   annunciation: string,
 *   tagline: string,
 *   sections: ModeSection[],
 * }} AutopilotMode
 */

/** @type {AutopilotMode[]} */
export const AUTOPILOT_MODES = [
  {
    id: 'AP',
    label: 'AP',
    axis: 'master',
    annunciation: 'AP',
    tagline: 'Autopilot engage / disengage',
    sections: [
      {
        heading: 'What it commands',
        body: 'AP connects the servos to the flight controls so the autopilot physically flies the airplane instead of just drawing guidance. Until you press it, the flight director is only advice on the screen and your hands are still doing all the work.',
      },
      {
        heading: 'What you see',
        body: 'A green AP appears in the annunciator bar above the attitude indicator. Pressing AP always brings the flight director along with it, so if no modes were selected you will get the default pair: roll hold laterally and pitch hold vertically.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Typically once established in the climb at a safe altitude, and again in cruise, so attention can shift to navigation, weather and radio work. It is a workload tool, not a substitute for knowing what the airplane is doing.',
      },
      {
        heading: 'Watch out for',
        body: 'Disconnect is normally done with the yoke button so you feel the airplane as you take it back. Know before you need it that the autopilot will not recover the airplane from an unusual attitude, and that it happily flies you into terrain if you have told it to.',
      },
    ],
  },
  {
    id: 'FD',
    label: 'FD',
    axis: 'master',
    annunciation: 'FD',
    tagline: 'Flight director command bars',
    sections: [
      {
        heading: 'What it commands',
        body: 'FD turns on the magenta command bars on the attitude indicator. It computes the pitch and bank the selected modes are asking for and shows it to you, but it moves nothing. You hand-fly and put the aircraft symbol inside the bars.',
      },
      {
        heading: 'What you see',
        body: 'Command bars appear, and the active lateral and vertical modes annunciate exactly as they would with the autopilot engaged. The guidance is identical either way; the only question is whether you or the servos are following it.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Hand-flying an instrument approach or a departure procedure while still wanting precise guidance, or keeping proficiency up on a day when you do not want the autopilot doing the flying for you.',
      },
      {
        heading: 'Watch out for',
        body: 'The bars are only as correct as the mode you selected. If you chase them without cross-checking raw data, a wrong heading bug or a stale altitude preselect gets flown very precisely into the wrong place.',
      },
    ],
  },
  {
    id: 'HDG',
    label: 'HDG',
    axis: 'lateral',
    annunciation: 'HDG',
    tagline: 'Heading select mode',
    sections: [
      {
        heading: 'What it commands',
        body: 'HDG banks the airplane to capture and hold whatever heading the heading bug is set to. Move the bug and the airplane turns to follow it, using a bank angle limit rather than snapping over.',
      },
      {
        heading: 'What you see',
        body: 'Green HDG in the lateral field of the annunciator bar. The flight director rolls toward the bug, rolls out on the new heading, then holds it.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Any time ATC gives you vectors. It is also the standard way to set up an intercept: fly a heading toward the course while NAV or APR sits armed in the background, waiting to take over at capture.',
      },
      {
        heading: 'Watch out for',
        body: 'Heading is not track. In a crosswind the airplane will hold the heading you asked for and drift off course anyway, so HDG keeps you pointed correctly, not necessarily positioned correctly.',
      },
    ],
  },
  {
    id: 'NAV',
    label: 'NAV',
    axis: 'lateral',
    annunciation: 'GPS',
    tagline: 'Course / GPS navigation tracking',
    sections: [
      {
        heading: 'What it commands',
        body: 'NAV tells the autopilot to intercept and then track the active navigation course, whether that is a GPS flight plan leg or a VOR radial, depending on what the CDI is set to.',
      },
      {
        heading: 'Armed versus active',
        body: 'This is the key idea. Press NAV while off course and it annunciates in white as armed; the current lateral mode keeps flying. When the course comes alive, the mode captures, moves to the active field and turns green. If you are already on course it may capture immediately.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Enroute navigation along a flight plan, and to take over from vectors once cleared direct or cleared to resume own navigation. With GPS coupled it will fly the turns between legs for you.',
      },
      {
        heading: 'Watch out for',
        body: 'The autopilot tracks whatever the CDI is showing. If the CDI is still on VLOC when you expected GPS, or the flight plan sequenced somewhere you did not intend, the airplane will faithfully fly the wrong course.',
      },
    ],
  },
  {
    id: 'APR',
    label: 'APR',
    axis: 'lateral',
    annunciation: 'LOC',
    tagline: 'Approach mode, lateral and glideslope',
    sections: [
      {
        heading: 'What it commands',
        body: 'APR arms the approach: lateral guidance for the localiser or GPS approach course, and at the same time it arms the vertical glideslope or glidepath. One button, two axes.',
      },
      {
        heading: 'Armed versus active',
        body: 'You will usually see two white armed annunciations at once, for example LOC and GS. The lateral course captures first, then the glideslope captures as you intercept it from below, each turning green as it goes active.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Once cleared for the approach and positioned to intercept, typically while still in HDG on a vector. APR uses tighter tracking gains than NAV because an approach demands far more precision than an enroute leg.',
      },
      {
        heading: 'Watch out for',
        body: 'Intercept the glideslope from below and at the published altitude. Arming APR while above the glideslope means it never captures properly, and pressing it too early can capture a false lobe or turn you before you are cleared.',
      },
    ],
  },
  {
    id: 'ALT',
    label: 'ALT',
    axis: 'vertical',
    annunciation: 'ALT',
    tagline: 'Altitude hold at the current altitude',
    sections: [
      {
        heading: 'What it commands',
        body: 'ALT immediately captures and holds the altitude you are at the instant you press it. Not the altitude in the preselect window, the one on the altimeter right now, rounded to the nearest increment.',
      },
      {
        heading: 'What you see',
        body: 'Green ALT with the captured altitude beside it. The flight director makes small pitch corrections to stay on that number, and adds or removes only what is needed.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Levelling in cruise, and holding a step-down altitude on an approach. In normal operation you rarely press it at all, because a climb in VS or FLC with an altitude preselected will capture and switch to ALT on its own.',
      },
      {
        heading: 'Watch out for',
        body: 'ALT holds altitude with pitch only; it does not manage the throttle. Level off from a climb without reducing power and the airplane will accelerate, and at cruise power it will keep accelerating until you deal with it.',
      },
    ],
  },
  {
    id: 'VS',
    label: 'VS',
    axis: 'vertical',
    annunciation: 'VS',
    tagline: 'Vertical speed mode',
    sections: [
      {
        heading: 'What it commands',
        body: 'VS holds a vertical speed you select in feet per minute, using pitch alone. Ask for five hundred feet per minute up and the airplane will pitch to whatever attitude delivers that, regardless of what it costs in airspeed.',
      },
      {
        heading: 'What you see',
        body: 'Green VS with the target rate. If an altitude is set in the preselect, ALTS arms in white alongside it, and the vertical mode transitions to ALT automatically at capture.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Small altitude changes, comfortable descents, and any time ATC asks for a specific rate. It gives a predictable, passenger-friendly profile because the rate is exactly what you dialled in.',
      },
      {
        heading: 'Watch out for',
        body: 'This is the mode that will trade away your airspeed. Demand a climb rate the airplane cannot sustain, particularly at altitude or on a hot day, and VS keeps pitching up and decaying airspeed toward a stall. Monitor the airspeed, or use FLC instead.',
      },
    ],
  },
  {
    id: 'FLC',
    label: 'FLC',
    axis: 'vertical',
    annunciation: 'FLC',
    tagline: 'Flight level change, airspeed-based climb or descent',
    sections: [
      {
        heading: 'What it commands',
        body: 'FLC holds an airspeed instead of a vertical rate. You set the target speed, the autopilot pitches to maintain it, and the vertical rate becomes whatever falls out of the power you have set. It climbs or descends toward the preselected altitude.',
      },
      {
        heading: 'What you see',
        body: 'Green FLC with the target airspeed, and ALTS armed in white for the preselected altitude. Direction is decided by the preselect: set an altitude above you and FLC climbs, set one below and it descends.',
      },
      {
        heading: 'When a pilot uses it',
        body: 'Sustained climbs, especially up high where performance is thin, because holding a speed protects the airplane from itself. Also useful in descents when you want to keep the speed pinned below a limit rather than watch it creep up.',
      },
      {
        heading: 'Watch out for',
        body: 'FLC does not touch the throttle, so power sets the rate. Select FLC in a climb without adding power and the airplane will hold the speed by simply stopping the climb. Select it in a descent at cruise power and you may end up descending far faster than you wanted.',
      },
    ],
  },
]

/** @type {Record<string, AutopilotMode>} */
export const MODE_BY_ID = Object.fromEntries(AUTOPILOT_MODES.map((m) => [m.id, m]))

/** Bezel layout: rows of button ids, mirroring the GFC 700 mode controller. */
export const BEZEL_ROWS = [
  ['AP', 'HDG', 'NAV', 'APR'],
  ['FD', 'ALT', 'VS', 'FLC'],
]

/** Flattens a mode into the single string handed to speech synthesis. */
export function modeNarration(mode) {
  return [
    `${mode.label}. ${mode.tagline}.`,
    ...mode.sections.map((s) => `${s.heading}. ${s.body}`),
  ].join(' ')
}
