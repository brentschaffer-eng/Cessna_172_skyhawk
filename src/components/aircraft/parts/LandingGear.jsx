import { useMemo } from 'react'
import { MAIN_AXLE, NOSE_AXLE } from './airframe.js'
import { makeProfile, profileShell } from './geometry.js'
import { ALUMINIUM, CHROME, PAINT, Part, RUBBER, SATIN_BLACK, STEEL, Strut } from './shared.jsx'

// Wheel fairing ("speed pant") around an axle at the origin: [z, half-width, top, bottom, nTop, nBot].
const PANT = makeProfile([
  [-0.5, 0.015, 0.07, 0.01, 2, 2],
  [-0.44, 0.075, 0.17, -0.07, 2.2, 2.2],
  [-0.26, 0.13, 0.28, -0.15, 2.4, 2.4],
  [0.0, 0.145, 0.32, -0.17, 2.5, 2.5],
  [0.25, 0.13, 0.28, -0.14, 2.4, 2.4],
  [0.46, 0.07, 0.19, -0.06, 2.2, 2.2],
  [0.6, 0.012, 0.13, 0.05, 2, 2],
])

function Wheel({ radius, width, hubRadius }) {
  const tube = width / 2
  return (
    <group>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <torusGeometry args={[radius - tube, tube, 24, 56]} />
        <meshPhysicalMaterial {...RUBBER} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[hubRadius, hubRadius, width * 0.82, 32]} />
        <meshPhysicalMaterial {...ALUMINIUM} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[hubRadius * 0.35, hubRadius * 0.35, width * 0.9, 20]} />
        <meshPhysicalMaterial {...CHROME} />
      </mesh>
    </group>
  )
}

export function LandingGear() {
  const pant = useMemo(() => profileShell(PANT, -0.5, 0.6, { segZ: 48, segT: 48 }), [])
  const noseScale = NOSE_AXLE.tire / MAIN_AXLE.tire

  return (
    <group>
      {/* Main gear: tapered tubular spring-steel legs, tyres, brake discs and wheel fairings. */}
      {[-1, 1].map((side) => {
        const axle = [side * MAIN_AXLE.x, MAIN_AXLE.y, MAIN_AXLE.z]
        const legTop = [side * 0.4, -0.55, -1.6]
        const legFoot = [side * (MAIN_AXLE.x - 0.12), MAIN_AXLE.y + 0.02, MAIN_AXLE.z]
        return (
          <group key={side}>
            <Strut from={legTop} to={legFoot} radius={0.05} radiusTop={0.034} material={PAINT} />
            <Strut
              from={[legTop[0], legTop[1] - 0.02, legTop[2] + 0.04]}
              to={[legFoot[0], legFoot[1] + 0.02, legFoot[2] + 0.04]}
              radius={0.007}
              material={SATIN_BLACK}
            />
            {/* Boarding step on the leg. */}
            <Strut from={[side * 0.74, -0.73, -1.61]} to={[side * 0.74, -0.73, -1.43]} radius={0.012} material={STEEL} />
            <mesh position={[side * 0.74, -0.715, -1.41]} castShadow>
              <boxGeometry args={[0.12, 0.012, 0.09]} />
              <meshPhysicalMaterial {...STEEL} />
            </mesh>

            <group position={axle}>
              <Wheel radius={MAIN_AXLE.tire} width={0.17} hubRadius={0.12} />
              <mesh position={[-side * 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 0.012, 32]} />
                <meshPhysicalMaterial {...STEEL} />
              </mesh>
              <Part geometry={pant} />
            </group>
          </group>
        )
      })}

      {/* Nose gear: oleo strut, chromed piston, torque links, fork, tyre and fairing. */}
      <Strut from={[0, -0.42, -3.24]} to={[0, -0.79, -3.28]} radius={0.048} material={STEEL} />
      <Strut from={[0, -0.79, -3.28]} to={[0, -0.92, -3.3]} radius={0.034} material={CHROME} />
      <Strut from={[0, -0.6, -3.21]} to={[0, -0.72, -3.15]} radius={0.016} flatten={0.6} material={STEEL} />
      <Strut from={[0, -0.72, -3.15]} to={[0, -0.86, -3.24]} radius={0.016} flatten={0.6} material={STEEL} />
      <mesh position={[0, -0.93, -3.3]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.12]} />
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.085, (NOSE_AXLE.y - 0.93) / 2, NOSE_AXLE.z]} castShadow>
          <boxGeometry args={[0.022, Math.abs(NOSE_AXLE.y + 0.93) + 0.04, 0.08]} />
          <meshPhysicalMaterial {...STEEL} />
        </mesh>
      ))}
      <group position={[NOSE_AXLE.x, NOSE_AXLE.y, NOSE_AXLE.z]}>
        <Wheel radius={NOSE_AXLE.tire} width={0.14} hubRadius={0.1} />
        <Part geometry={pant} scale={[noseScale * 0.92, noseScale, noseScale]} />
      </group>
    </group>
  )
}
