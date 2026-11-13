import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FIREWALL_Z, FUSELAGE, LIVERY_BANDS, NOSE_Z } from './airframe.js'
import { mergeGeometries, profileShell, sideBand, surfaceGeometry } from './geometry.js'
import { ALUMINIUM, EXHAUST, GOLD, NAVY, PAINT, PROP_TIP, Part, SATIN_BLACK, SEAM, Strut } from './shared.jsx'

const PROP_Z = NOSE_Z - 0.03
const PROP_PITCH = 1.45 // metres of advance per revolution
const BLADE_AIRFOIL = { m: 0.04, p: 0.4, t: 0.12 }
const BLADE_COLOUR = { color: '#2b3036', metalness: 0.45, roughness: 0.5 }

// [radius, chord, thickness ratio]: round shank, wide mid-blade, rounded tip.
const BLADE = [
  [0.14, 0.07, 0.95],
  [0.2, 0.09, 0.55],
  [0.28, 0.13, 0.22],
  [0.4, 0.155, 0.13],
  [0.55, 0.155, 0.1],
  [0.7, 0.14, 0.085],
  [0.82, 0.12, 0.075],
  [0.88, 0.108, 0.072],
  [0.92, 0.094, 0.068],
  [0.945, 0.075, 0.064],
  [0.958, 0.045, 0.06],
]

function bladeStation([r, chord, ratio]) {
  // Blade angle falls from ~58° at the root to ~14° at the tip, giving constant geometric pitch.
  const beta = Math.min(Math.atan(PROP_PITCH / (2 * Math.PI * r)), THREE.MathUtils.degToRad(58))
  const c = Math.cos(beta)
  const s = Math.sin(beta)
  return {
    le: [r, 0.35 * chord * c, -0.35 * chord * s],
    chord,
    chordDir: [0, -c, s],
    thickDir: [0, -s, -c],
    thick: ratio / BLADE_AIRFOIL.t,
  }
}

function buildPowerplant() {
  const bands = { navy: [], gold: [] }
  for (const side of [-1, 1]) {
    LIVERY_BANDS.forEach(({ colour, centre, half }) =>
      bands[colour].push(
        sideBand(FUSELAGE, {
          z0: NOSE_Z + 0.03,
          z1: FIREWALL_Z,
          low: (z) => centre(z) - half(z),
          high: (z) => centre(z) + half(z),
          side,
          segZ: 30,
          segT: 2,
        }),
      ),
    )
  }
  const seams = mergeGeometries(
    [-1, 1].map((side) =>
      sideBand(FUSELAGE, { z0: NOSE_Z + 0.06, z1: FIREWALL_Z - 0.01, low: 0.046, high: 0.054, side, segT: 1 }),
    ),
  )

  const spinnerPoints = []
  for (let i = 0; i <= 32; i++) {
    const u = i / 32
    spinnerPoints.push(new THREE.Vector2(0.175 * Math.pow(1 - u ** 2.2, 0.55), 0.38 * u))
  }

  const root = BLADE.findIndex(([r]) => r === 0.88)
  return {
    cowl: profileShell(FUSELAGE, NOSE_Z, FIREWALL_Z, { segZ: 40, segT: 96 }),
    navy: mergeGeometries(bands.navy),
    gold: mergeGeometries(bands.gold),
    seams,
    spinner: new THREE.LatheGeometry(spinnerPoints, 64),
    blade: surfaceGeometry(BLADE.slice(0, root + 1).map(bladeStation), BLADE_AIRFOIL, { n: 24 }),
    bladeTip: surfaceGeometry(BLADE.slice(root).map(bladeStation), BLADE_AIRFOIL, { n: 24 }),
  }
}

/** Cowling, exhaust and propeller. */
export function Powerplant({ spin }) {
  const g = useMemo(() => buildPowerplant(), [])
  const propRef = useRef()

  useFrame((_, delta) => {
    if (spin && propRef.current) propRef.current.rotation.z += delta * 9
  })

  return (
    <group>
      <Part geometry={g.cowl} />
      <Part geometry={g.navy} material={NAVY} decal />
      <Part geometry={g.gold} material={GOLD} decal />
      <Part geometry={g.seams} material={SEAM} decal />

      {/* Cooling-air inlets either side of the spinner. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.18, 0.05, NOSE_Z - 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.8]}>
          <cylinderGeometry args={[0.085, 0.085, 0.012, 32]} />
          <meshPhysicalMaterial {...SATIN_BLACK} color="#0c0e10" />
        </mesh>
      ))}

      {/* Exhaust tailpipe under the cowling. */}
      <Strut from={[0.22, -0.36, -3.0]} to={[0.25, -0.64, -2.82]} radius={0.03} material={EXHAUST} />

      {/* Spinner and two-blade fixed-pitch propeller. */}
      <group ref={propRef} position={[0, -0.01, PROP_Z]}>
        <Part geometry={g.spinner} rotation={[-Math.PI / 2, 0, 0]} material={{ ...PAINT, metalness: 0.2 }} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.02, 48]} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>
        {[0, Math.PI].map((angle) => (
          <group key={angle} rotation={[0, 0, angle]} position={[0, 0, -0.06]}>
            <Part geometry={g.blade} material={BLADE_COLOUR} />
            <Part geometry={g.bladeTip} material={PROP_TIP} />
          </group>
        ))}
      </group>
    </group>
  )
}
