import { useMemo } from 'react'
import { FIREWALL_Z, FUSELAGE, LIVERY_BANDS, LIVERY_END_Z, TAIL_Z, getRegistrationTexture } from './airframe.js'
import { mergeGeometries, overTop, panelOutline, profileShell, sectionCap, sideBand } from './geometry.js'
import { GLASS, GOLD, NAVY, PAINT, Part, SATIN_BLACK, SEAM, STEEL } from './shared.jsx'

const SIDES = [-1, 1]

function buildFuselage() {
  const both = (make) => mergeGeometries(SIDES.map((side) => make(side)))

  const livery = { navy: [], gold: [] }
  LIVERY_BANDS.forEach(({ colour, centre, half }) =>
    SIDES.forEach((side) =>
      livery[colour].push(
        sideBand(FUSELAGE, {
          z0: FIREWALL_Z,
          z1: LIVERY_END_Z,
          low: (z) => centre(z) - half(z),
          high: (z) => centre(z) + half(z),
          side,
          segZ: 90,
          segT: 2,
        }),
      ),
    ),
  )

  return {
    shell: profileShell(FUSELAGE, FIREWALL_Z, TAIL_Z, { segZ: 120, segT: 96 }),
    firewall: sectionCap(FUSELAGE, FIREWALL_Z - 0.004, 96),
    glass: mergeGeometries([
      overTop(FUSELAGE, { z0: -2.6, z1: -1.84, low: 0.44 }),
      overTop(FUSELAGE, { z0: -0.12, z1: 0.62, low: (z) => 0.66 - (0.12 * (z + 0.12)) / 0.74 }),
      both((side) => sideBand(FUSELAGE, { z0: -1.78, z1: -1.02, low: 0.22, high: 0.78, side })),
      both((side) =>
        sideBand(FUSELAGE, { z0: -0.9, z1: -0.2, low: 0.3, high: (z) => 0.78 - (0.14 * (z + 0.9)) / 0.7, side }),
      ),
    ]),
    seams: mergeGeometries([
      both((side) => panelOutline(FUSELAGE, { z0: -1.86, z1: -0.94, low: -0.48, high: 0.84, side })),
      panelOutline(FUSELAGE, { z0: 0.15, z1: 0.62, low: -0.36, high: 0.06, side: -1 }),
    ]),
    navy: mergeGeometries(livery.navy),
    gold: mergeGeometries(livery.gold),
    registration: SIDES.map((side) =>
      sideBand(FUSELAGE, { z0: 1.15, z1: 2.45, low: -0.06, high: 0.2, side, flipU: side > 0, offset: 0.005 }),
    ),
  }
}

export function Fuselage() {
  const g = useMemo(() => buildFuselage(), [])
  const registration = useMemo(() => getRegistrationTexture(), [])
  const topAt = (z) => FUSELAGE(z).top
  const bottomAt = (z) => FUSELAGE(z).bottom

  return (
    <group>
      <Part geometry={g.shell} />
      {/* Firewall: visible once the powerplant slides forward. */}
      <Part geometry={g.firewall} material={STEEL} decal />
      <Part geometry={g.glass} material={GLASS} decal />
      <Part geometry={g.seams} material={SEAM} decal />
      <Part geometry={g.navy} material={NAVY} decal />
      <Part geometry={g.gold} material={GOLD} decal />
      {g.registration.map((geometry, i) => (
        <Part key={i} geometry={geometry} material={{ ...PAINT, color: '#ffffff' }} map={registration} decal />
      ))}

      {/* COM blade antennas on the tail cone, transponder blade underneath. */}
      {[0.85, 1.45].map((z) => (
        <mesh key={z} position={[0, topAt(z) + 0.09, z + 0.02]} rotation={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.012, 0.2, 0.08]} />
          <meshPhysicalMaterial {...SATIN_BLACK} />
        </mesh>
      ))}
      <mesh position={[0, bottomAt(-0.6) - 0.04, -0.6]} castShadow>
        <boxGeometry args={[0.01, 0.08, 0.05]} />
        <meshPhysicalMaterial {...SATIN_BLACK} />
      </mesh>

      {/* Tail tie-down ring. */}
      <mesh position={[0, bottomAt(3.25) - 0.04, 3.25]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.03, 0.007, 8, 20]} />
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
    </group>
  )
}
