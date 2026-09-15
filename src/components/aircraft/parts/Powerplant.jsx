import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ENGINE, SKIN } from './shared.jsx'

/**
 * Cowling, engine block and propeller. The cowling fades out while the part is
 * selected so the four opposed cylinders underneath become visible.
 */
export function Powerplant({ selected, spin }) {
  const propRef = useRef()

  useFrame((_, delta) => {
    if (spin && propRef.current) propRef.current.rotation.z += delta * 9
  })

  return (
    <group>
      {/* Engine block and four horizontally opposed cylinders */}
      <mesh position={[0, 0.02, -3.85]}>
        <boxGeometry args={[0.5, 0.42, 0.85]} />
        <meshStandardMaterial {...ENGINE} transparent />
      </mesh>
      {[-1, 1].map((side) =>
        [-0.28, 0.06].map((z) => (
          <mesh
            key={`${side}-${z}`}
            position={[side * 0.42, 0.02, -3.85 + z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.15, 0.16, 0.36, 12]} />
            <meshStandardMaterial color="#6b737d" metalness={0.5} roughness={0.65} transparent />
          </mesh>
        )),
      )}

      {/* Exhaust stack */}
      <mesh position={[0.18, -0.3, -3.8]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 10]} />
        <meshStandardMaterial color="#4d5157" metalness={0.8} roughness={0.4} transparent />
      </mesh>

      {/* Cowling */}
      <mesh position={[0, 0.02, -3.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.7, 0.98, 22]} />
        <meshStandardMaterial
          {...SKIN}
          transparent
          userData={{ baseOpacity: selected ? 0.25 : 1 }}
        />
      </mesh>

      {/* Cooling air inlets */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.2, -0.08, -4.38]}>
          <boxGeometry args={[0.24, 0.16, 0.06]} />
          <meshStandardMaterial color="#14181d" roughness={0.9} transparent />
        </mesh>
      ))}

      {/* Spinner and two-blade propeller */}
      <group ref={propRef} position={[0, 0.02, -4.45]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.42, 18]} />
          <meshStandardMaterial color="#d0d5da" metalness={0.8} roughness={0.2} transparent />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.62, 0, -0.06]} rotation={[0.22 * side, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.15, 0.13, 0.04]} />
              <meshStandardMaterial color="#1c2127" metalness={0.5} roughness={0.5} transparent />
            </mesh>
            <mesh position={[side * 0.5, 0, 0]}>
              <boxGeometry args={[0.16, 0.135, 0.045]} />
              <meshStandardMaterial color="#f0b429" metalness={0.3} roughness={0.5} transparent />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
