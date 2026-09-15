import * as THREE from 'three'
import { SKIN, SKIN_DARK } from './shared.jsx'

// Body of revolution: [radius, distance aft of the firewall].
const PROFILE = [
  [0.30, 0.0],
  [0.62, 0.35],
  [0.78, 1.1],
  [0.80, 2.6],
  [0.74, 3.6],
  [0.56, 4.9],
  [0.38, 6.1],
  [0.24, 7.1],
  [0.16, 7.6],
]

const GLASS = { color: '#0e2a3d', metalness: 0.2, roughness: 0.08 }

export function Fuselage() {
  const lathePoints = PROFILE.map(([r, y]) => new THREE.Vector2(r, y))

  return (
    <group>
      {/* Shell: lathed along +Y, laid down along +Z, then squashed into an oval section. */}
      <mesh
        position={[0, 0, -3.6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.95, 1, 1.1]}
        castShadow
        receiveShadow
      >
        <latheGeometry args={[lathePoints, 28]} />
        <meshStandardMaterial {...SKIN} transparent />
      </mesh>

      {/* Firewall bulkhead, visible once the powerplant slides forward. */}
      <mesh position={[0, 0, -3.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.04, 20]} />
        <meshStandardMaterial color="#8d949c" metalness={0.85} roughness={0.25} transparent />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.5, -2.75]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[1.14, 0.9, 0.05]} />
        <meshStandardMaterial {...GLASS} transparent userData={{ baseOpacity: 0.72 }} />
      </mesh>

      {/* Side windows */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.76, 0.34, -2.15]}>
            <boxGeometry args={[0.06, 0.52, 0.95]} />
            <meshStandardMaterial {...GLASS} transparent userData={{ baseOpacity: 0.72 }} />
          </mesh>
          <mesh position={[side * 0.74, 0.32, -1.05]}>
            <boxGeometry args={[0.06, 0.42, 0.8]} />
            <meshStandardMaterial {...GLASS} transparent userData={{ baseOpacity: 0.72 }} />
          </mesh>
          {/* Cabin door outline */}
          <mesh position={[side * 0.77, -0.05, -2.1]}>
            <boxGeometry args={[0.02, 0.78, 1.0]} />
            <meshStandardMaterial {...SKIN_DARK} transparent />
          </mesh>
        </group>
      ))}

      {/* Cabin roof fairing under the wing centre section */}
      <mesh position={[0, 0.76, -1.5]}>
        <boxGeometry args={[1.05, 0.22, 1.5]} />
        <meshStandardMaterial {...SKIN} transparent />
      </mesh>

      {/* Livery stripe along the waterline */}
      <mesh position={[0, -0.18, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.805, 0.805, 0.1, 24, 1, true]} />
        <meshStandardMaterial color="#2f6fb5" metalness={0.3} roughness={0.5} side={THREE.DoubleSide} transparent />
      </mesh>
    </group>
  )
}
