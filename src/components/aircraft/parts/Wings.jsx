import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AirfoilSlab, SKIN, Strut } from './shared.jsx'

const WING_Y = 0.95
const LE_Z = -2.3
const CHORD = 1.25
const HINGE_Z = LE_Z + CHORD // trailing edge of the fixed wing box
const SURFACE_CHORD = 0.42
const DIHEDRAL = 0.03
const FLAP_DOWN = 0.62 // ~35 degrees
const AILERON_THROW = 0.34

/** A trailing-edge surface that hinges about the wing's rear spar line. */
function ControlSurface({ side, innerX, outerX, targetAngle }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, targetAngle, 5, delta)
  })

  const span = outerX - innerX
  const centerX = side * (innerX + span / 2)

  return (
    <group ref={ref} position={[centerX, 0, HINGE_Z]}>
      <mesh position={[0, 0, SURFACE_CHORD / 2]} castShadow>
        <boxGeometry args={[span, 0.07, SURFACE_CHORD]} />
        <meshStandardMaterial {...SKIN} transparent />
      </mesh>
    </group>
  )
}

function WingPanel({ side, flapsDown, rollInput }) {
  // Right aileron up means left aileron down; that opposition is the whole point.
  const aileronAngle = rollInput * AILERON_THROW * -side

  return (
    <group rotation={[0, 0, side * DIHEDRAL]}>
      <AirfoilSlab
        span={4.7}
        chord={CHORD}
        thickness={0.16}
        position={[side * 3.15, 0, LE_Z + CHORD / 2]}
      />

      {/* Wingtip cap with its navigation light */}
      <mesh position={[side * 5.45, 0.02, LE_Z + CHORD / 2]} castShadow>
        <boxGeometry args={[0.22, 0.14, CHORD * 0.85]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.4} roughness={0.4} transparent />
      </mesh>
      <mesh position={[side * 5.56, 0.02, LE_Z + 0.2]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial
          color={side > 0 ? '#2ecc71' : '#e74c3c'}
          emissive={side > 0 ? '#2ecc71' : '#e74c3c'}
          emissiveIntensity={0.9}
          transparent
        />
      </mesh>

      <ControlSurface side={side} innerX={0.95} outerX={2.85} targetAngle={flapsDown ? FLAP_DOWN : 0} />
      <ControlSurface side={side} innerX={3.0} outerX={5.2} targetAngle={aileronAngle} />
    </group>
  )
}

export function Wings({ flapsDown = false, rollInput = 0 }) {
  return (
    <group position={[0, WING_Y, 0]}>
      {/* Centre section carrying through above the cabin */}
      <AirfoilSlab span={1.7} chord={CHORD} thickness={0.17} position={[0, 0, LE_Z + CHORD / 2]} />

      {[-1, 1].map((side) => (
        <WingPanel key={side} side={side} flapsDown={flapsDown} rollInput={rollInput} />
      ))}

      {/* Lift struts and jury struts, measured back to the fuselage in model space */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Strut
            from={[side * 0.52, -1.45, -1.45]}
            to={[side * 2.85, -0.06, LE_Z + 0.95]}
            radius={0.055}
          />
          <Strut
            from={[side * 1.75, -0.78, -1.55]}
            to={[side * 1.95, -0.06, LE_Z + 0.5]}
            radius={0.028}
          />
        </group>
      ))}
    </group>
  )
}
