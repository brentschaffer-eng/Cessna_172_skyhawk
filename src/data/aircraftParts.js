/**
 * Aircraft part catalogue. Every visible string for the Aircraft View lives here so
 * the on-screen text and the spoken narration can never drift apart.
 *
 * `explode` is the offset (in scene units) the part group translates to when selected.
 * Model axes: +X = right wing, +Y = up, -Z = nose, +Z = tail.
 *
 * @typedef {{ heading: string, body: string }} PartSection
 * @typedef {{
 *   id: string,
 *   label: string,
 *   tagline: string,
 *   accent: string,
 *   explode: [number, number, number],
 *   sections: PartSection[],
 * }} AircraftPart
 */

/** @type {AircraftPart[]} */
export const AIRCRAFT_PARTS = [
  {
    id: 'powerplant',
    label: 'Powerplant',
    tagline: 'Engine, propeller and spinner',
    accent: '#ff7a45',
    explode: [0, 0.15, -2.6],
    sections: [
      {
        heading: 'What it does',
        body: 'The powerplant turns fuel into thrust. A horizontally opposed, air-cooled piston engine sits behind the firewall and spins a propeller, and that propeller is really just a rotating wing: it produces lift pointed forward, which we call thrust. Everything else the airplane does depends on that thrust being steady and predictable.',
      },
      {
        heading: 'How it is built',
        body: 'Four cylinders lie flat in two opposing banks, so the engine is wide and short rather than tall. Cooling air enters through the two openings in the cowling, passes over finned cylinder heads, and exits underneath. The propeller bolts directly to the crankshaft, which means propeller speed and engine speed are always the same number on the tachometer.',
      },
      {
        heading: 'What the pilot controls',
        body: 'You have a throttle for power and a mixture control for the fuel-to-air ratio. As you climb, the air thins out but the fuel flow does not, so the mixture goes progressively richer unless you lean it. Leaning at altitude keeps the engine running smoothly and efficiently; forgetting to enrich before descending back down is a classic student mistake.',
      },
      {
        heading: 'Why it matters in flight',
        body: 'The propeller is spinning one direction, and the airplane reacts to that. At high power and low airspeed, especially during takeoff and climb, the airplane wants to yaw left. You counter it with right rudder. That is not a defect to fix, it is a normal characteristic you fly with on every single climb.',
      },
    ],
  },
  {
    id: 'fuselage',
    label: 'Fuselage',
    tagline: 'Main body, cabin and firewall',
    accent: '#4dabf7',
    explode: [0, 0, 0],
    sections: [
      {
        heading: 'What it does',
        body: 'The fuselage is the backbone. It carries the cabin, the flight controls, the baggage area and the fuel and electrical plumbing, and it ties the wings, tail and landing gear into one structure. Every load the wings and tail generate eventually passes through it.',
      },
      {
        heading: 'How it is built',
        body: 'It is semi-monocoque aluminium construction: a frame of vertical formers and lengthwise stringers wrapped in a riveted aluminium skin. The skin is not just a cover, it carries a large share of the load, which is why even shallow dents and wrinkles are treated as real findings rather than cosmetic ones.',
      },
      {
        heading: 'The cabin',
        body: 'Two front seats sit side by side with dual controls, so either seat can fly the airplane. Behind them is a bench seat and a baggage compartment. Where you put people and bags moves the centre of gravity, and the airplane handles noticeably differently when loaded aft compared with loaded forward.',
      },
      {
        heading: 'Why it matters in flight',
        body: 'A stainless steel firewall separates the engine from the cabin. Ahead of it live heat, fuel and moving parts; behind it live the people. Weight and balance is a fuselage conversation as much as a weight conversation, because an airplane can be under gross weight and still be unsafe if the load sits too far aft.',
      },
    ],
  },
  {
    id: 'wings',
    label: 'Wings',
    tagline: 'High-mounted wing, struts, flaps and ailerons',
    accent: '#63e6be',
    explode: [0, 1.9, 0],
    sections: [
      {
        heading: 'What it does',
        body: 'The wings make lift. Air accelerating over the curved upper surface produces lower pressure above than below, and that pressure difference holds the airplane up. Lift grows with airspeed and with angle of attack, and the pilot trades between those two constantly.',
      },
      {
        heading: 'High wing and struts',
        body: 'The Skyhawk carries its wing above the cabin and braces each side with a single external strut. That layout buys excellent visibility downward, easy fuel feeding by gravity, and natural roll stability, at the cost of a little drag from the struts. It also puts the wing in the way when you look into a turn, which is why you clear the airspace before rolling.',
      },
      {
        heading: 'Ailerons and flaps',
        body: 'Ailerons live at the outboard trailing edge and move opposite each other to roll the airplane. Flaps live inboard and move together, extending downward to increase both lift and drag. Flaps let you descend more steeply and touch down slower without adding airspeed, which is why they are a landing tool rather than a lift button.',
      },
      {
        heading: 'Fuel and stall behaviour',
        body: 'The fuel tanks are inside the wings and feed the engine by gravity plus pump. The wing is also built with a slight twist so the inboard section stalls before the tips, which keeps the ailerons effective a moment longer and makes the stall break gentle and straightforward to recover.',
      },
    ],
  },
  {
    id: 'empennage',
    label: 'Empennage',
    tagline: 'Tail group: stabilisers, elevator and rudder',
    accent: '#b197fc',
    explode: [0, 0.45, 2.7],
    sections: [
      {
        heading: 'What it does',
        body: 'The empennage is the tail group, and its job is stability and control in two axes. The vertical fin and rudder handle yaw, the horizontal stabiliser and elevator handle pitch. Think of it as the feathers on an arrow: it keeps the nose pointed into the relative wind instead of wandering.',
      },
      {
        heading: 'Pitch control',
        body: 'The horizontal stabiliser is a small wing that normally produces downward force, holding the nose up against the airplane\'s natural tendency to pitch down. The elevator hinges off its trailing edge, and moving it changes that download, which changes the angle of attack, which changes airspeed. Pitch and airspeed are linked.',
      },
      {
        heading: 'Yaw control and trim',
        body: 'The rudder does not turn the airplane, it coordinates the turn by keeping the nose aligned with the flight path. Rolling with ailerons alone produces adverse yaw, and rudder cancels it. An elevator trim tab lets you hold a pitch attitude hands-off, and trimming properly is the difference between flying the airplane and wrestling it.',
      },
      {
        heading: 'Why it matters in flight',
        body: 'Control effectiveness depends on airflow, and airflow depends on airspeed. Slow down and the tail gets sluggish, requiring larger control inputs for the same result. In a slow-flight or landing configuration you will notice you are moving the controls much further than you do in cruise, and that is normal.',
      },
    ],
  },
  {
    id: 'gear',
    label: 'Landing Gear',
    tagline: 'Fixed tricycle gear, nosewheel and brakes',
    accent: '#ffd43b',
    explode: [0, -1.9, 0],
    sections: [
      {
        heading: 'What it does',
        body: 'The landing gear supports the airplane on the ground, absorbs the touchdown, and lets you steer and stop. The Skyhawk uses a fixed tricycle arrangement: two main wheels behind the centre of gravity and a steerable nosewheel up front. Fixed means there is nothing to raise or lower and nothing to forget.',
      },
      {
        heading: 'How it is built',
        body: 'The main gear legs are tapered spring-steel tubes that flex to soak up landing loads, with no hydraulics or air-oil struts to service. The nose gear uses an oleo strut that compresses on touchdown. That spring steel is also why a fast, flat arrival can produce a bounce: the energy you put in comes straight back out.',
      },
      {
        heading: 'Steering and braking',
        body: 'On the ground you steer with the rudder pedals, which are linked to the nosewheel. The toe brakes on top of each pedal operate independently, so differential braking tightens a turn when you need it. As you accelerate on the takeoff roll, steering authority transitions from the nosewheel to aerodynamic rudder.',
      },
      {
        heading: 'Why it matters in flight',
        body: 'Tricycle gear is naturally stable in a rollout because the centre of gravity sits ahead of the main wheels, so the airplane tends to track straight rather than swap ends. The trade is that the nosewheel is the most fragile part: land nose-low and you can overload it, so every landing is flown to touch down on the mains first.',
      },
    ],
  },
]

/** @type {Record<string, AircraftPart>} */
export const PART_BY_ID = Object.fromEntries(AIRCRAFT_PARTS.map((p) => [p.id, p]))

/** Flattens a part into the single string handed to speech synthesis. */
export function partNarration(part) {
  return [
    `${part.label}. ${part.tagline}.`,
    ...part.sections.map((s) => `${s.heading}. ${s.body}`),
  ].join(' ')
}
