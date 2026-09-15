import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AirfoilSlab, ExtrudedSurface, SKIN } from './shared.jsx'

// Profiles are drawn in the longitudinal/vertical plane, then rotated into the fin plane.
const FIN = [
  [0, 0.05],
  [0.25, 0.95],
  [0.92, 1.62],
  [1.16, 1.62],
  [1.2, 0.05],
]

const RUDDER = [
  [0, 0.05],
  [0.06, 1.6],
  [0.52, 1.58],
  [0.34, 0.02],
]

const DORSAL = [
  [-1.25, 0.02],
  [0.02, 0.62],
  [0.02, 0.02],
]

const STAB_Z = 3.45
const ELEV_HINGE_Z = STAB_Z + 0.42

export function Empennage({ pitchInput = 0, yawInput = 0 }) {
  const elevatorRef = useRef()
  const rudderRef = useRef()

  useFrame((_, delta) => {
    if (elevatorRef.current) {
      // Pulling back (+pitch) deflects the elevator trailing edge up, so the angle is negative.
      elevatorRef.current.rotation.x = THREE.MathUtils.damp(
        elevatorRef.current.rotation.x,
        -pitchInput * 0.38,
        5,
        delta,
      )
    }
    if (rudderRef.current) {
      rudderRef.current.rotation.y = THREE.MathUtils.damp(
        rudderRef.current.rotation.y,
        -yawInput * 0.42,
        5,
        delta,
      )
    }
  })

  return (
    <group>
      {/* Dorsal fin blending the fin into the tail cone */}
      <ExtrudedSurface
        points={DORSAL}
        thickness={0.06}
        position={[0.03, 0.2, 2.9]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Vertical stabiliser */}
      <ExtrudedSurface
        points={FIN}
        thickness={0.09}
        position={[0.045, 0.2, 2.9]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Rudder, hinged at the fin's trailing edge */}
      <group ref={rudderRef} position={[0, 0.2, 4.1]}>
        <ExtrudedSurface
          points={RUDDER}
          thickness={0.08}
          position={[0.04, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </group>

      {/* Horizontal stabiliser */}
      <AirfoilSlab span={3.5} chord={0.85} thickness={0.12} position={[0, 0.28, STAB_Z]} />

      {/* Elevator with its trim tab */}
      <group ref={elevatorRef} position={[0, 0.28, ELEV_HINGE_Z]}>
        <mesh position={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[3.5, 0.07, 0.4]} />
          <meshStandardMaterial {...SKIN} transparent />
        </mesh>
        <mesh position={[-0.95, 0, 0.42]}>
          <boxGeometry args={[0.55, 0.05, 0.12]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.4} roughness={0.5} transparent />
        </mesh>
      </group>

      {/* Tail beacon */}
      <mesh position={[0, 1.85, 3.9]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#e74c3c" emissive="#e74c3c" emissiveIntensity={0.8} transparent />
      </mesh>
    </group>
  )
}
