import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FUSELAGE } from './airframe.js'
import { linspace, mergeGeometries, surfaceGeometry } from './geometry.js'
import { Lamp, PAINT, Part, SATIN_BLACK, Strut } from './shared.jsx'

const TAIL_AIRFOIL = { t: 0.1 }
const FIN_AIRFOIL = { t: 0.08 }

// Horizontal tail: straight hinge line, swept leading edge, elevator aft of 55% chord.
const STAB_Y = 0.12
const ELEV_HINGE_Z = 3.265
const ELEV_HINGE_F = 0.55
const STAB_SEMISPAN = 1.725

// Vertical tail: rudder hinged on a vertical line behind the swept fin.
const RUDDER_HINGE_Z = 3.58
const FIN_HINGE_F = 0.75
const RUDDER_HINGE_F = 0.6

function stabStation(x, { chordScale = 1, thick = 1 } = {}) {
  const ax = Math.min(Math.abs(x), STAB_SEMISPAN)
  const chord = (1.3 - (0.35 * ax) / STAB_SEMISPAN) * chordScale
  return { le: [x, STAB_Y, ELEV_HINGE_Z - ELEV_HINGE_F * chord], chord, thick }
}

const stabTip = (sign) => [
  stabStation(sign * 1.758, { chordScale: 0.9, thick: 0.75 }),
  stabStation(sign * 1.782, { chordScale: 0.68, thick: 0.4 }),
]

function finStation(y, { chordScale = 1, thick = 1, leShift = 0 } = {}) {
  const leZ = 2.28 + (0.82 * (y - 0.22)) / 1.2 + leShift
  const chord = ((RUDDER_HINGE_Z - leZ) / FIN_HINGE_F) * chordScale
  return { le: [0, y, leZ], chord, chordDir: [0, 0, 1], thickDir: [1, 0, 0], thick }
}

function rudderStation(y, aftChord, thick = 1) {
  const chord = aftChord / (1 - RUDDER_HINGE_F)
  return { le: [0, y, -RUDDER_HINGE_F * chord], chord, chordDir: [0, 0, 1], thickDir: [1, 0, 0], thick }
}

function buildEmpennage() {
  const stab = []
  const elevator = []
  const elev = (xs, sign, from, to = 1, extra = []) =>
    surfaceGeometry([...xs.map((x) => stabStation(sign * x)), ...extra], TAIL_AIRFOIL, {
      from,
      to,
      n: 28,
      roundNose: from === ELEV_HINGE_F,
    })

  for (const sign of [-1, 1]) {
    stab.push(elev([0, STAB_SEMISPAN], sign, 0, ELEV_HINGE_F, stabTip(sign)))
    if (sign > 0) {
      elevator.push(
        elev([0.1, 0.3], sign, ELEV_HINGE_F),
        elev([0.3, 0.8], sign, ELEV_HINGE_F, 0.86),
        elev([0.8, STAB_SEMISPAN], sign, ELEV_HINGE_F, 1, stabTip(sign)),
      )
    } else {
      elevator.push(elev([0.1, STAB_SEMISPAN], sign, ELEV_HINGE_F, 1, stabTip(sign)))
    }
  }
  const trimTab = elev([0.31, 0.79], 1, 0.865)

  const fin = surfaceGeometry(
    [
      ...linspace(0.22, 1.42, 4).map((y) => finStation(y)),
      finStation(1.462, { chordScale: 0.92, thick: 0.7, leShift: 0.05 }),
      finStation(1.485, { chordScale: 0.78, thick: 0.35, leShift: 0.12 }),
    ],
    FIN_AIRFOIL,
    { to: FIN_HINGE_F, n: 28 },
  )

  const rudder = surfaceGeometry(
    [
      rudderStation(-0.04, 0.24, 0.5),
      rudderStation(0.0, 0.34),
      rudderStation(0.3, 0.44),
      rudderStation(1.3, 0.4),
      rudderStation(1.44, 0.36),
      rudderStation(1.505, 0.28, 0.7),
      rudderStation(1.535, 0.16, 0.35),
    ],
    FIN_AIRFOIL,
    { from: RUDDER_HINGE_F, n: 28, roundNose: true },
  )

  // Dorsal fin: a concave fillet sweeping from the tail cone into the fin's leading edge.
  const top = (z) => FUSELAGE(z).top
  const shape = new THREE.Shape()
  shape.moveTo(0.95, top(0.95) - 0.03)
  shape.quadraticCurveTo(2.15, top(2.15) + 0.02, 2.62, 0.71)
  shape.lineTo(2.8, 0.62)
  shape.lineTo(2.8, 0.25)
  shape.closePath()
  const dorsal = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 4,
    curveSegments: 24,
  })

  return { stab: mergeGeometries(stab), elevator: mergeGeometries(elevator), trimTab, fin, rudder, dorsal }
}

export function Empennage({ pitchInput = 0, yawInput = 0 }) {
  const g = useMemo(buildEmpennage, [])
  const elevatorRef = useRef()
  const rudderRef = useRef()

  useFrame((_, delta) => {
    if (elevatorRef.current) {
      // Pulling back (+pitch) deflects the elevator trailing edge up, so the angle is negative.
      elevatorRef.current.rotation.x = THREE.MathUtils.damp(elevatorRef.current.rotation.x, -pitchInput * 0.38, 5, delta)
    }
    if (rudderRef.current) {
      rudderRef.current.rotation.y = THREE.MathUtils.damp(rudderRef.current.rotation.y, -yawInput * 0.42, 5, delta)
    }
  })

  return (
    <group>
      <Part geometry={g.stab} />
      <Part geometry={g.fin} />
      {/* Extruded along +Z, then turned so the profile lies in the fin plane. */}
      <Part geometry={g.dorsal} position={[0.015, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

      <group ref={elevatorRef} position={[0, STAB_Y, ELEV_HINGE_Z]}>
        <group position={[0, -STAB_Y, -ELEV_HINGE_Z]}>
          <Part geometry={g.elevator} />
          <Part geometry={g.trimTab} />
        </group>
      </group>

      <group ref={rudderRef} position={[0, 0, RUDDER_HINGE_Z]}>
        <Part geometry={g.rudder} />
        {/* White tail position light on the rudder trailing edge. */}
        <Lamp colour="#ffffff" radius={0.028} intensity={1.4} position={[0, 0.07, 0.33]} />
      </group>

      {/* Anti-collision beacon on the fin cap. */}
      <mesh position={[0, 1.49, 3.3]}>
        <cylinderGeometry args={[0.03, 0.04, 0.03, 16]} />
        <meshPhysicalMaterial {...SATIN_BLACK} transparent />
      </mesh>
      <Lamp colour="#ff2a1a" radius={0.035} position={[0, 1.52, 3.3]} />

      {/* VOR "cat whisker" antenna either side of the fin. */}
      {[-1, 1].map((side) => (
        <Strut key={side} from={[side * 0.02, 1.36, 3.05]} to={[side * 0.4, 1.32, 2.78]} radius={0.006} material={SATIN_BLACK} />
      ))}
      <mesh position={[0, 1.36, 3.06]}>
        <boxGeometry args={[0.06, 0.04, 0.06]} />
        <meshPhysicalMaterial {...PAINT} transparent />
      </mesh>
    </group>
  )
}
