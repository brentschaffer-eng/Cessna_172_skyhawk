import { RUBBER, SKIN, STEEL, Strut } from './shared.jsx'

function Wheel({ position, radius = 0.3, width = 0.17, fairing = true }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius, radius, width, 18]} />
        <meshStandardMaterial {...RUBBER} transparent />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.5, radius * 0.5, width + 0.02, 14]} />
        <meshStandardMaterial color="#c4ccd4" metalness={0.7} roughness={0.35} transparent />
      </mesh>
      {fairing && (
        <mesh position={[0, 0.06, -0.05]} scale={[0.85, 1, 1.45]} castShadow>
          <sphereGeometry args={[radius * 0.95, 14, 12]} />
          <meshStandardMaterial {...SKIN} transparent />
        </mesh>
      )}
    </group>
  )
}

export function LandingGear() {
  return (
    <group>
      {/* Main gear: tapered spring-steel legs that flex under landing loads */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Strut
            from={[side * 0.2, -0.55, -1.15]}
            to={[side * 1.42, -1.2, -1.15]}
            radius={0.055}
            radiusTop={0.085}
          />
          <Wheel position={[side * 1.5, -1.3, -1.15]} />
        </group>
      ))}

      {/* Nose gear: oleo strut, scissor link and fork */}
      <mesh position={[0, -0.72, -3.15]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
        <meshStandardMaterial {...STEEL} transparent />
      </mesh>
      <mesh position={[0, -1.06, -3.15]}>
        <cylinderGeometry args={[0.065, 0.065, 0.32, 12]} />
        <meshStandardMaterial color="#dfe4e9" metalness={0.9} roughness={0.15} transparent />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.11, -1.24, -3.15]}>
          <boxGeometry args={[0.04, 0.22, 0.08]} />
          <meshStandardMaterial {...STEEL} transparent />
        </mesh>
      ))}
      <Wheel position={[0, -1.34, -3.15]} radius={0.26} width={0.14} />

      {/* Step and brake lines hinting at the maintenance detail behind the gear */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.85, -0.92, -1.15]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.018, 0.018, 0.75, 8]} />
          <meshStandardMaterial color="#2b3037" roughness={0.8} transparent />
        </mesh>
      ))}
    </group>
  )
}
