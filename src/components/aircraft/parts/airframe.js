import * as THREE from 'three'
import { camberPoint, makeProfile, nacaPoint, stationPoint } from './geometry.js'

/*
 * Cessna 172S dimensions in metres. Nose points to -Z, +Y is up, +X is the right wing.
 * Overall: 8.28 m long, 11.0 m span, 2.72 m tall, main gear track 2.54 m.
 */

export const NOSE_Z = -3.95
export const FIREWALL_Z = -2.75
export const TAIL_Z = 3.62
export const GROUND_Y = -1.25

// [z, half-width, top, bottom, nTop, nBottom]
export const FUSELAGE = makeProfile([
  [-3.95, 0.3, 0.24, -0.27, 2.2, 2.2],
  [-3.85, 0.42, 0.34, -0.38, 2.4, 2.4],
  [-3.55, 0.5, 0.42, -0.48, 2.6, 2.6],
  [-3.1, 0.54, 0.47, -0.55, 2.8, 2.8],
  [-2.75, 0.56, 0.5, -0.58, 3.0, 3.0],
  [-2.45, 0.575, 0.62, -0.61, 3.3, 3.2],
  [-2.1, 0.58, 0.8, -0.62, 3.7, 3.2],
  [-1.8, 0.58, 0.9, -0.62, 4.2, 3.2],
  [-0.3, 0.575, 0.9, -0.6, 4.2, 3.2],
  [0.3, 0.52, 0.76, -0.52, 3.4, 3.0],
  [1.2, 0.4, 0.56, -0.38, 2.8, 2.6],
  [2.2, 0.27, 0.42, -0.22, 2.4, 2.4],
  [3.0, 0.16, 0.34, -0.08, 2.2, 2.2],
  [3.5, 0.07, 0.29, 0.04, 2.0, 2.0],
  [TAIL_Z, 0.02, 0.26, 0.1, 2.0, 2.0],
])

/* ------------------------------------------------------------------ Wing */

export const WING_AIRFOIL = { m: 0.02, p: 0.4, t: 0.12 } // NACA 2412, as on the real aircraft
export const WING = {
  rootY: 0.97,
  leZ: -1.8,
  rootChord: 1.63,
  tipChord: 1.12,
  breakX: 2.55, // constant-chord centre panel ends, tapered outer panel begins
  tipX: 5.3,
  dihedral: Math.tan(THREE.MathUtils.degToRad(1.73)),
  washout: THREE.MathUtils.degToRad(3),
  flap: { inner: 0.63, outer: 2.49, hinge: 0.73 },
  aileron: { inner: 2.63, outer: 5.04, hinge: 0.74 },
}

export function wingStation(x, { leShift = 0, chordScale = 1, thick = 1, droop = 0 } = {}) {
  const ax = Math.abs(x)
  const taper = THREE.MathUtils.clamp((ax - WING.breakX) / (WING.tipX - WING.breakX), 0, 1)
  const baseChord = THREE.MathUtils.lerp(WING.rootChord, WING.tipChord, taper)
  const chord = baseChord * chordScale
  const twist = WING.washout * taper
  const y = WING.rootY + Math.min(ax, WING.tipX) * WING.dihedral - droop
  return {
    le: [x, y - 0.25 * chord * Math.sin(twist), WING.leZ + 0.06 * taper + leShift * baseChord],
    chord,
    chordDir: [0, Math.sin(twist), Math.cos(twist)],
    thickDir: [0, Math.cos(twist), -Math.sin(twist)],
    thick,
  }
}

/** Rounded, slightly drooped tip stations outboard of WING.tipX. */
export function wingTipStations(sign) {
  return [
    [0.07, 0.04, 0.92, 0.88, 0.005],
    [0.14, 0.11, 0.78, 0.66, 0.012],
    [0.19, 0.26, 0.5, 0.36, 0.02],
  ].map(([dx, leShift, chordScale, thick, droop]) =>
    wingStation(sign * (WING.tipX + dx), { leShift, chordScale, thick, droop }),
  )
}

export function wingSurfacePoint(x, frac, upper) {
  const s = wingStation(x)
  const [px, py] = nacaPoint(WING_AIRFOIL, frac, upper)
  return stationPoint(s, px, py)
}

export const wingHingePoint = (x, frac) => camberPoint(wingStation(x), WING_AIRFOIL, frac)

/* ------------------------------------------------------------------ Gear */

export const MAIN_AXLE = { x: 1.27, y: GROUND_Y + 0.265, z: -1.65, tire: 0.265 }
export const NOSE_AXLE = { x: 0, y: GROUND_Y + 0.225, z: -3.3, tire: 0.225 }

/* ------------------------------------------------------------------ Livery */

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export const LIVERY_END_Z = 0.9
const swoosh = (z) => -0.14 + 0.44 * smoothstep(-1.2, LIVERY_END_Z, z)
const taper = (z) => Math.sqrt(THREE.MathUtils.clamp((LIVERY_END_Z - z) / 0.9, 0, 1))

/** Navy cheat-line with a gold pinstripe, sweeping up into a swoosh behind the cabin. */
export const LIVERY_BANDS = [
  { colour: 'navy', centre: swoosh, half: (z) => 0.06 * taper(z) },
  { colour: 'gold', centre: (z) => swoosh(z) + 0.1, half: (z) => 0.018 * taper(z) },
  { colour: 'navy', centre: (z) => swoosh(z) - 0.09, half: (z) => 0.011 * taper(z) },
]

export const REGISTRATION = 'Beesone'

let registrationTexture
/** Canvas texture of the registration so no font or image needs to be downloaded. */
export function getRegistrationTexture() {
  if (registrationTexture) return registrationTexture
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 192
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1f2f4f'
  ctx.font = 'bold 168px "Arial Narrow", Arial, Helvetica, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(REGISTRATION, 512, 100, 980)
  registrationTexture = new THREE.CanvasTexture(canvas)
  registrationTexture.colorSpace = THREE.SRGBColorSpace
  registrationTexture.anisotropy = 8
  return registrationTexture
}
