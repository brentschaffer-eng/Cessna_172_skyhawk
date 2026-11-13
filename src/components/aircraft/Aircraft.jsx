import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Fuselage } from './parts/Fuselage.jsx'
import { Powerplant } from './parts/Powerplant.jsx'
import { Wings } from './parts/Wings.jsx'
import { Empennage } from './parts/Empennage.jsx'
import { LandingGear } from './parts/LandingGear.jsx'

/**
 * The assembled Skyhawk. `simRef` is the live simulation state: the airframe's pitch and bank
 * are read from it every frame instead of arriving as props, so flying does not re-render the model.
 */
export function Aircraft({ controls, simRef }) {
  const attitudeRef = useRef()
  useFrame(() => {
    const s = simRef?.current
    if (!s || !attitudeRef.current) return
    attitudeRef.current.rotation.x = (s.pitch * Math.PI) / 180
    attitudeRef.current.rotation.z = (-s.bank * Math.PI) / 180
  })

  return (
    <group ref={attitudeRef} position={[0, 0.35, 0]} rotation-order="YXZ">
      <Powerplant spin={controls.propSpin} />
      <Fuselage />
      <Wings flapsDown={controls.flapsDown} rollInput={controls.rollInput} />
      <Empennage pitchInput={controls.pitchInput} yawInput={controls.yawInput} />
      <LandingGear />
    </group>
  )
}
