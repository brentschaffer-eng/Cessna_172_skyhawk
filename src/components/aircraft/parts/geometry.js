import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export { mergeGeometries }

const sgnPow = (v, e) => Math.sign(v) * Math.abs(v) ** e
export const v3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(...a))
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))

/** Monotone cubic (Fritsch–Carlson) interpolation: smooth like a spline, but never overshoots. */
export function monotoneSpline(xs, ys) {
  const n = xs.length
  const d = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      m[i] = k * a * d[i]
      m[i + 1] = k * b * d[i]
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const t = (x - xs[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    )
  }
}

/**
 * Joins equal-length rings of points into a closed, capped solid. Caps get their own
 * vertices so their edges stay crisp, and duplicate ring points act as hard creases.
 */
export function loftGeometry(sections, { capStart = true, capEnd = true } = {}) {
  const ring = sections[0].length
  const positions = []
  const index = []
  sections.forEach((s) => s.forEach((p) => positions.push(p.x, p.y, p.z)))
  for (let j = 0; j < sections.length - 1; j++) {
    for (let i = 0; i < ring; i++) {
      const a = j * ring + i
      const b = j * ring + ((i + 1) % ring)
      index.push(a, b, b + ring, a, b + ring, a + ring)
    }
  }
  const cap = (section, reverse) => {
    const base = positions.length / 3
    const c = section.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(ring)
    positions.push(c.x, c.y, c.z)
    section.forEach((p) => positions.push(p.x, p.y, p.z))
    for (let i = 0; i < ring; i++) {
      const p = base + 1 + i
      const q = base + 1 + ((i + 1) % ring)
      if (reverse) index.push(base, q, p)
      else index.push(base, p, q)
    }
  }
  if (capStart) cap(sections[0], true)
  if (capEnd) cap(sections[sections.length - 1], false)

  // Point every face outwards regardless of how the rings were wound (e.g. mirrored parts).
  let volume = 0
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < index.length; i += 3) {
    a.fromArray(positions, index[i] * 3)
    b.fromArray(positions, index[i + 1] * 3)
    c.fromArray(positions, index[i + 2] * 3)
    volume += a.dot(b.clone().cross(c))
  }
  if (volume < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]]
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/* ------------------------------------------------------------------ Aerofoils */

/** A point on a NACA 4-digit section (closed trailing edge), chord normalised to 1. */
export function nacaPoint({ m = 0, p = 0.4, t = 0.12 }, x, upper) {
  const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4)
  let yc = 0
  let dyc = 0
  if (m > 0) {
    if (x < p) {
      yc = (m / p ** 2) * (2 * p * x - x * x)
      dyc = ((2 * m) / p ** 2) * (p - x)
    } else {
      yc = (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x)
      dyc = ((2 * m) / (1 - p) ** 2) * (p - x)
    }
  }
  const th = Math.atan(dyc)
  const s = upper ? 1 : -1
  return [x - s * yt * Math.sin(th), yc + s * yt * Math.cos(th)]
}

/**
 * Closed outline of the slice of an aerofoil between two chord fractions, so a wing can be
 * split at its hinge line into a fixed part and a moving control surface.
 */
export function airfoilLoop(airfoil, { from = 0, to = 1, n = 28, roundNose = false } = {}) {
  const xs = linspace(0, 1, n + 1).map((u) => from + ((to - from) * (1 - Math.cos(Math.PI * u))) / 2)
  const up = xs.map((x) => nacaPoint(airfoil, x, true))
  const lo = xs.map((x) => nacaPoint(airfoil, x, false))
  const loop = []
  if (to < 1) loop.push(up[n])
  for (let i = n; i >= 0; i--) loop.push(up[i])
  if (from === 0) {
    for (let i = 1; i <= n; i++) loop.push(lo[i])
  } else {
    if (roundNose) {
      const cx = (up[0][0] + lo[0][0]) / 2
      const cy = (up[0][1] + lo[0][1]) / 2
      const r = Math.hypot(up[0][0] - lo[0][0], up[0][1] - lo[0][1]) / 2
      for (let k = 1; k < 10; k++) {
        const a = Math.PI / 2 + (Math.PI * k) / 10
        loop.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
      }
    } else {
      loop.push(up[0], lo[0])
    }
    for (let i = 0; i <= n; i++) loop.push(lo[i])
  }
  if (to < 1) loop.push(lo[n])
  return loop
}

/**
 * Lofts an aerofoil through span stations. Each station places the section's leading edge,
 * with optional chord/thickness directions (for twist or vertical surfaces) and a thickness scale.
 */
export function stationPoint({ le, chord, chordDir = [0, 0, 1], thickDir = [0, 1, 0], thick = 1 }, x, y) {
  return v3(le)
    .addScaledVector(v3(chordDir).normalize(), x * chord)
    .addScaledVector(v3(thickDir).normalize(), y * chord * thick)
}

export function surfaceGeometry(stations, airfoil, options = {}) {
  const loop = airfoilLoop(airfoil, options)
  return loftGeometry(stations.map((s) => loop.map(([x, y]) => stationPoint(s, x, y))))
}

/** Point on the camber line at a chord fraction — where a control surface hinges. */
export function camberPoint(station, airfoil, x) {
  const u = nacaPoint(airfoil, x, true)
  const l = nacaPoint(airfoil, x, false)
  return stationPoint(station, x, (u[1] + l[1]) / 2)
}

/** Frame whose local X runs along a hinge line (always pointing +X) and local Z points aft. */
export function hingeFrame(a, b) {
  const [A, B] = a.x <= b.x ? [a.clone(), b.clone()] : [b.clone(), a.clone()]
  const x = B.sub(A).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const y = up.sub(x.clone().multiplyScalar(up.dot(x))).normalize()
  const z = new THREE.Vector3().crossVectors(x, y)
  const matrix = new THREE.Matrix4().makeBasis(x, y, z).setPosition(A)
  return {
    position: A,
    quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix),
    inverse: matrix.clone().invert(),
  }
}

/* ------------------------------------------------- Superellipse bodies of revolution */

/**
 * Builds a smooth body profile from rows of [z, halfWidth, top, bottom, nTop, nBottom].
 * Cross-sections are superellipses: n = 2 is an ellipse, larger n gives squarer shoulders.
 */
export function makeProfile(rows) {
  const zs = rows.map((r) => r[0])
  const fns = [1, 2, 3, 4, 5].map((k) => monotoneSpline(zs, rows.map((r) => r[k])))
  return (z) => {
    const [a, top, bottom, nTop, nBot] = fns.map((f) => f(z))
    return { a, top, bottom, cy: (top + bottom) / 2, b: (top - bottom) / 2, nTop, nBot }
  }
}

export function sectionPoint(sec, t, offset = 0) {
  const n = Math.sin(t) >= 0 ? sec.nTop : sec.nBot
  let x = sec.a * sgnPow(Math.cos(t), 2 / n)
  let y = sec.b * sgnPow(Math.sin(t), 2 / n)
  if (offset) {
    const r = Math.hypot(x, y) || 1
    x *= 1 + offset / r
    y *= 1 + offset / r
  }
  return [x, sec.cy + y]
}

/** Parameter on the right-hand side of a section that sits at height y. */
export function tAtY(sec, y) {
  const v = THREE.MathUtils.clamp((y - sec.cy) / sec.b, -1, 1)
  return Math.asin(sgnPow(v, (v >= 0 ? sec.nTop : sec.nBot) / 2))
}

export function profileShell(profile, z0, z1, { segZ = 80, segT = 72, ends } = {}) {
  const sections = []
  for (let j = 0; j <= segZ; j++) {
    const z = z0 + ((z1 - z0) * j) / segZ
    const sec = profile(z)
    const ring = []
    for (let i = 0; i < segT; i++) {
      const [x, y] = sectionPoint(sec, (2 * Math.PI * i) / segT)
      ring.push(new THREE.Vector3(x, y, z))
    }
    sections.push(ring)
  }
  return loftGeometry(sections, ends)
}

/** Flat plate matching a body's cross-section (firewalls, nose bowls). */
export function sectionCap(profile, z, segT = 72, offset = 0) {
  const sec = profile(z)
  const positions = [0, sec.cy, z]
  for (let i = 0; i < segT; i++) {
    const [x, y] = sectionPoint(sec, (2 * Math.PI * i) / segT, offset)
    positions.push(x, y, z)
  }
  const index = []
  for (let i = 0; i < segT; i++) index.push(0, 1 + i, 1 + ((i + 1) % segT))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * A thin skin that hugs a body between z0..z1 over the parameter range tRange(z, section).
 * Used for windows, livery and panel lines; UVs run along z (u) and around the body (v).
 */
export function profilePatch(profile, { z0, z1, tRange, side = 1, offset = 0.004, segZ = 32, segT = 16, flipU = false }) {
  const positions = []
  const uvs = []
  const index = []
  for (let j = 0; j <= segZ; j++) {
    const z = z0 + ((z1 - z0) * j) / segZ
    const sec = profile(z)
    const [t0, t1] = tRange(z, sec)
    for (let i = 0; i <= segT; i++) {
      const [x, y] = sectionPoint(sec, t0 + ((t1 - t0) * i) / segT, offset)
      positions.push(side * x, y, z)
      uvs.push(flipU ? 1 - j / segZ : j / segZ, i / segT)
    }
  }
  const row = segT + 1
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segT; i++) {
      const a = j * row + i
      index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/** Patch on one side of the body between two (possibly z-varying) heights. */
export function sideBand(profile, { z0, z1, low, high, side = 1, ...rest }) {
  const f = (v) => (typeof v === 'function' ? v : () => v)
  const lo = f(low)
  const hi = f(high)
  return profilePatch(profile, { z0, z1, side, tRange: (z, sec) => [tAtY(sec, lo(z)), tAtY(sec, hi(z))], ...rest })
}

/** Patch that wraps over the top of the body from one side to the other above a height. */
export function overTop(profile, { z0, z1, low, ...rest }) {
  const lo = typeof low === 'function' ? low : () => low
  return profilePatch(profile, {
    z0,
    z1,
    segT: 40,
    tRange: (z, sec) => {
      const t = tAtY(sec, lo(z))
      return [t, Math.PI - t]
    },
    ...rest,
  })
}

/** Outline of a rectangular panel (door, hatch) drawn as four thin seams. */
export function panelOutline(profile, { z0, z1, low, high, side = 1, width = 0.008 }) {
  const w = width / 2
  return mergeGeometries([
    sideBand(profile, { z0, z1, low: high - w, high: high + w, side, segT: 1 }),
    sideBand(profile, { z0, z1, low: low - w, high: low + w, side, segT: 1 }),
    sideBand(profile, { z0: z0 - w, z1: z0 + w, low, high, side, segZ: 1 }),
    sideBand(profile, { z0: z1 - w, z1: z1 + w, low, high, side, segZ: 1 }),
  ])
}
