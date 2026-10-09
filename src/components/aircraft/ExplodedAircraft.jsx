import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AIRCRAFT_PARTS } from '../../data/aircraftParts.js'
import { Fuselage } from './parts/Fuselage.jsx'
import { Powerplant } from './parts/Powerplant.jsx'
import { Wings } from './parts/Wings.jsx'
import { Empennage } from './parts/Empennage.jsx'
import { LandingGear } from './parts/LandingGear.jsx'

const DIM_OPACITY = 0.22
const ORIGIN = [0, 0, 0]

/**
 * Wraps one assembly: handles the explode translation, the dim/highlight pass and
 * pointer selection. Materials are mutated directly each frame rather than through
 * React state so the animation stays off the render path.
 */
function PartGroup({ part, selected, anySelected, onSelect, reducedMotion, children }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)

  // Re-runs on every render because parts may rebuild their materials (e.g. the cowling).
  useEffect(() => {
    ref.current.traverse((obj) => {
      const material = obj.material
      if (!material) return
      material.transparent = true
      if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = 1
      if (material.userData.highlightable === undefined) {
        material.userData.highlightable = Boolean(material.emissive) && material.emissive.getHex() === 0
        if (material.userData.highlightable) {
          material.emissive.set(part.accent)
          material.emissiveIntensity = 0
        }
      }
    })
  })

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return

    const [ex, ey, ez] = selected ? part.explode : ORIGIN
    if (reducedMotion) {
      group.position.set(ex, ey, ez)
    } else {
      group.position.x = THREE.MathUtils.damp(group.position.x, ex, 4, delta)
      group.position.y = THREE.MathUtils.damp(group.position.y, ey, 4, delta)
      group.position.z = THREE.MathUtils.damp(group.position.z, ez, 4, delta)
    }

    const dim = !anySelected || selected ? 1 : DIM_OPACITY
    const glow = selected ? 0.45 : hovered ? 0.18 : 0

    group.traverse((obj) => {
      const material = obj.material
      if (!material) return
      const target = (material.userData.baseOpacity ?? 1) * dim
      material.opacity = reducedMotion
        ? target
        : THREE.MathUtils.damp(material.opacity, target, 6, delta)
      // Keeps fully opaque parts writing depth so the model does not look hollow.
      material.depthWrite = material.opacity > 0.97
      if (material.userData.highlightable) {
        material.emissiveIntensity = reducedMotion
          ? glow
          : THREE.MathUtils.damp(material.emissiveIntensity, glow, 6, delta)
      }
    })
  })

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(part.id)
      }}
    >
      {children}
    </group>
  )
}

export function ExplodedAircraft({ selectedId, onSelect, reducedMotion, controls }) {
  const anySelected = Boolean(selectedId)
  const shared = { anySelected, onSelect, reducedMotion }

  const renderers = {
    powerplant: <Powerplant selected={selectedId === 'powerplant'} spin={controls.propSpin} />,
    fuselage: <Fuselage />,
    wings: <Wings flapsDown={controls.flapsDown} rollInput={controls.rollInput} />,
    empennage: <Empennage pitchInput={controls.pitchInput} yawInput={controls.yawInput} />,
    gear: <LandingGear />,
  }

  const pitch = ((controls?.apPitch || 0) * Math.PI) / 180
  const bank = (-(controls?.apBank || 0) * Math.PI) / 180

  return (
    <group position={[0, 0.35, 0]} rotation={[pitch, 0, bank]} rotation-order="YXZ">
      {AIRCRAFT_PARTS.map((part) => (
        <PartGroup key={part.id} part={part} selected={selectedId === part.id} {...shared}>
          {renderers[part.id]}
        </PartGroup>
      ))}
    </group>
  )
}
