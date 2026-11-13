import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WING, WING_AIRFOIL, wingHingePoint, wingStation, wingSurfacePoint, wingTipStations } from './airframe.js'
import { hingeFrame, linspace, mergeGeometries, stationPoint, surfaceGeometry } from './geometry.js'
import { CHROME, GLASS, Lamp, PAINT, Part, SATIN_BLACK, STEEL, Strut } from './shared.jsx'

const FLAP_DOWN = THREE.MathUtils.degToRad(30)
const AILERON_THROW = THREE.MathUtils.degToRad(20)

const loft = (xs, sign, options, extra = []) =>
  surfaceGeometry([...xs.map((x) => wingStation(sign * x)), ...extra], WING_AIRFOIL, { n: 36, ...options })

/** Wing surface between two span positions, rebuilt in its hinge frame so it can rotate in place. */
function controlSurface(sign, { inner, outer, hinge }, stations) {
  const xs = linspace(inner, outer, stations)
  const frame = hingeFrame(wingHingePoint(sign * inner, hinge), wingHingePoint(sign * outer, hinge))
  const geometry = loft(xs, sign, { from: hinge, roundNose: true }).applyMatrix4(frame.inverse)
  return { frame, geometry }
}

function buildWings() {
  const { flap, aileron } = WING
  const fixed = [
    surfaceGeometry([-flap.inner, 0, flap.inner].map((x) => wingStation(x)), WING_AIRFOIL, { n: 36 }),
  ]
  for (const sign of [-1, 1]) {
    fixed.push(
      loft(linspace(flap.inner, flap.outer, 4), sign, { to: flap.hinge }),
      loft([flap.outer, WING.breakX, aileron.inner], sign, {}),
      loft(linspace(aileron.inner, aileron.outer, 6), sign, { to: aileron.hinge }),
      loft([aileron.outer, WING.tipX], sign, {}, wingTipStations(sign)),
    )
  }
  return {
    fixed: mergeGeometries(fixed),
    flaps: [-1, 1].map((sign) => ({ sign, ...controlSurface(sign, flap, 4) })),
    ailerons: [-1, 1].map((sign) => ({ sign, ...controlSurface(sign, aileron, 6) })),
  }
}

function HingedSurface({ frame, geometry, angle, slide = 0 }) {
  const ref = useRef()
  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, angle, 5, delta)
    // Fowler-style flaps also travel aft and down as they extend.
    g.position.z = THREE.MathUtils.damp(g.position.z, slide, 5, delta)
    g.position.y = THREE.MathUtils.damp(g.position.y, -slide * 0.3, 5, delta)
  })
  return (
    <group position={frame.position} quaternion={frame.quaternion}>
      <group ref={ref}>
        <Part geometry={geometry} />
      </group>
    </group>
  )
}

const toArray = (v) => [v.x, v.y, v.z]

export function Wings({ flapsDown = false, rollInput = 0 }) {
  const g = useMemo(() => buildWings(), [])

  return (
    <group>
      <Part geometry={g.fixed} />

      {g.flaps.map(({ sign, frame, geometry }) => (
        <HingedSurface
          key={`flap${sign}`}
          frame={frame}
          geometry={geometry}
          angle={flapsDown ? FLAP_DOWN : 0}
          slide={flapsDown ? 0.12 : 0}
        />
      ))}
      {g.ailerons.map(({ sign, frame, geometry }) => (
        // Right aileron up means left aileron down; that opposition is what rolls the aircraft.
        <HingedSurface key={`ail${sign}`} frame={frame} geometry={geometry} angle={rollInput * AILERON_THROW * -sign} />
      ))}

      {[-1, 1].map((sign) => {
        const strutTop = wingSurfacePoint(sign * 2.5, 0.28, false)
        const tip = wingTipStations(sign)[2]
        return (
          <group key={sign}>
            {/* Streamlined lift strut with its end fairings. */}
            <Strut
              from={[sign * 0.52, -0.42, -1.42]}
              to={[strutTop.x, strutTop.y + 0.02, strutTop.z]}
              radius={0.052}
              flatten={0.38}
              material={PAINT}
            />
            <mesh position={[strutTop.x, strutTop.y - 0.01, strutTop.z]} scale={[0.6, 0.5, 1.3]} castShadow>
              <sphereGeometry args={[0.07, 16, 12]} />
              <meshPhysicalMaterial {...PAINT} />
            </mesh>
            <mesh position={[sign * 0.56, -0.42, -1.42]} scale={[0.5, 0.7, 1.4]} castShadow>
              <sphereGeometry args={[0.07, 16, 12]} />
              <meshPhysicalMaterial {...PAINT} />
            </mesh>

            {/* Fuel filler cap near the root of each wing. */}
            {(() => {
              const p = wingSurfacePoint(sign * 1.0, 0.32, true)
              return (
                <mesh position={toArray(p)}>
                  <cylinderGeometry args={[0.04, 0.045, 0.014, 20]} />
                  <meshPhysicalMaterial {...CHROME} />
                </mesh>
              )
            })()}

            {/* Position light (red left, green right) and white strobe, set into the rounded tip. */}
            <Lamp colour={sign > 0 ? '#22e06b' : '#ff3030'} radius={0.035} position={toArray(stationPoint(tip, 0.15, 0))} />
            <Lamp colour="#ffffff" radius={0.025} intensity={1.2} position={toArray(stationPoint(tip, 0.7, 0))} />
          </group>
        )
      })}

      {/* Left wing: landing/taxi light lens, stall-warning inlet and pitot tube. */}
      {(() => {
        const s = wingStation(-1.55)
        return (
          <mesh position={[-1.55, s.le[1] + 0.005, s.le[2] + 0.012]}>
            <boxGeometry args={[0.32, 0.08, 0.02]} />
            <meshPhysicalMaterial {...GLASS} color="#dfe8ef" emissive="#fff6d8" emissiveIntensity={0.4} />
          </mesh>
        )
      })()}
      {(() => {
        const s = wingStation(-1.0)
        return (
          <mesh position={[-1.0, s.le[1] - 0.005, s.le[2] + 0.006]}>
            <boxGeometry args={[0.07, 0.02, 0.012]} />
            <meshPhysicalMaterial {...SATIN_BLACK} />
          </mesh>
        )
      })()}
      {(() => {
        const p = wingSurfacePoint(-2.15, 0.2, false)
        return (
          <group>
            <Strut from={[p.x, p.y + 0.02, p.z]} to={[p.x, p.y - 0.09, p.z - 0.05]} radius={0.012} flatten={0.6} />
            <Strut from={[p.x, p.y - 0.09, p.z - 0.05]} to={[p.x, p.y - 0.09, p.z - 0.32]} radius={0.009} material={STEEL} />
          </group>
        )
      })()}
    </group>
  )
}
