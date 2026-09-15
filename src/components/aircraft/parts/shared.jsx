import * as THREE from 'three'

export const SKIN = { color: '#e9ecef', metalness: 0.35, roughness: 0.42 }
export const SKIN_DARK = { color: '#aeb6bf', metalness: 0.4, roughness: 0.5 }
export const RUBBER = { color: '#22262b', metalness: 0.05, roughness: 0.95 }
export const STEEL = { color: '#7d8590', metalness: 0.75, roughness: 0.35 }
export const ENGINE = { color: '#4a525c', metalness: 0.6, roughness: 0.5 }

const UP = new THREE.Vector3(0, 1, 0)

/**
 * A cylinder stretched between two points — used for wing struts and gear legs,
 * which are far easier to express as endpoints than as position plus rotation.
 */
export function Strut({ from, to, radius = 0.05, radiusTop, material = STEEL }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = new THREE.Vector3().subVectors(b, a)
  const length = dir.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
  const mid = a.clone().add(b).multiplyScalar(0.5)

  return (
    <mesh position={mid} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radiusTop ?? radius, radius, length, 10]} />
      <meshStandardMaterial {...material} transparent />
    </mesh>
  )
}

/**
 * Builds an aerofoil-ish slab: a box with the leading edge rounded off by a
 * half-cylinder, which reads far more like a wing than a bare box does.
 */
export function AirfoilSlab({ span, chord, thickness, material = SKIN, ...props }) {
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[span, thickness, chord]} />
        <meshStandardMaterial {...material} transparent />
      </mesh>
      <mesh position={[0, 0, -chord / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[thickness / 2, thickness / 2, span, 12]} />
        <meshStandardMaterial {...material} transparent />
      </mesh>
    </group>
  )
}

/** Extrudes a flat profile (points in the longitudinal/vertical plane) into a tail surface. */
export function ExtrudedSurface({ points, thickness, material = SKIN, ...props }) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()

  return (
    <mesh {...props} castShadow>
      <extrudeGeometry
        args={[shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 }]}
      />
      <meshStandardMaterial {...material} side={THREE.DoubleSide} transparent />
    </mesh>
  )
}
