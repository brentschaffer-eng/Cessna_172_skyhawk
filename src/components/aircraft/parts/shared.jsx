import * as THREE from 'three'

const gloss = { clearcoat: 0.75, clearcoatRoughness: 0.1 }

export const PAINT = { color: '#f5f7fa', metalness: 0.02, roughness: 0.3, ...gloss }
export const NAVY = { color: '#1d3a72', metalness: 0.05, roughness: 0.32, ...gloss }
export const GOLD = { color: '#c79b32', metalness: 0.4, roughness: 0.32, ...gloss }
export const GLASS = { color: '#0b1822', metalness: 0.1, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02 }
export const SEAM = { color: '#9ea8b3', metalness: 0.05, roughness: 0.55 }
export const RUBBER = { color: '#1a1d21', metalness: 0, roughness: 0.9 }
export const STEEL = { color: '#8c949d', metalness: 0.85, roughness: 0.32 }
export const CHROME = { color: '#e6ebf0', metalness: 1, roughness: 0.1 }
export const ALUMINIUM = { color: '#c3c9cf', metalness: 0.9, roughness: 0.28 }
export const EXHAUST = { color: '#6b5546', metalness: 0.75, roughness: 0.55 }
export const SATIN_BLACK = { color: '#24282d', metalness: 0.3, roughness: 0.55 }
export const PROP_TIP = { color: '#f2c230', metalness: 0.1, roughness: 0.4 }

/**
 * Mesh with a physical material. `decal` skins sit a few millimetres proud of the body,
 * render both faces and win the depth test so they never shimmer.
 */
export function Part({ geometry, material = PAINT, decal = false, map, children, ...props }) {
  return (
    <mesh geometry={geometry} castShadow={!decal} receiveShadow {...props}>
      {children}
      <meshPhysicalMaterial
        {...material}
        map={map ?? null}
        alphaTest={map ? 0.4 : 0}
        side={decal ? THREE.DoubleSide : THREE.FrontSide}
        polygonOffset={decal}
        polygonOffsetFactor={decal ? -2 : 0}
        polygonOffsetUnits={decal ? -4 : 0}
      />
    </mesh>
  )
}

/** Emissive lens for navigation, beacon and landing lights. */
export function Lamp({ colour, intensity = 2, radius = 0.04, ...props }) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={intensity} toneMapped={false} />
    </mesh>
  )
}

/**
 * Tube stretched between two points — struts, legs, pipes. `flatten` squashes it sideways into
 * a streamlined section whose long axis stays aligned with the airflow (+Z).
 */
export function Strut({ from, to, radius = 0.04, radiusTop, flatten = 1, material = STEEL, segments = 18 }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const yAxis = b.clone().sub(a)
  const length = yAxis.length()
  yAxis.normalize()
  const ref = Math.abs(yAxis.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
  const zAxis = ref.sub(yAxis.clone().multiplyScalar(ref.dot(yAxis))).normalize()
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis)
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))

  return (
    <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={quaternion} scale={[flatten, 1, 1]} castShadow receiveShadow>
      <cylinderGeometry args={[radiusTop ?? radius, radius, length, segments]} />
      <meshPhysicalMaterial {...material} />
    </mesh>
  )
}
