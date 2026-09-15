import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { ExplodedAircraft } from './ExplodedAircraft.jsx'

export function AircraftScene({ selectedId, onSelect, reducedMotion, controls }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [8.5, 4.2, 9.5], fov: 42 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#0a0e14']} />
      <fog attach="fog" args={['#0a0e14', 20, 46]} />

      <hemisphereLight args={['#9fc6ff', '#1b2027', 0.7]} />
      <directionalLight
        position={[7, 11, 6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-8, 3, -7]} intensity={0.55} color="#7aa7ff" />

      <Suspense fallback={null}>
        <ExplodedAircraft
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          controls={controls}
        />
        <ContactShadows position={[0, -2.6, 0]} opacity={0.4} scale={26} blur={2.6} far={6} />
      </Suspense>

      <Grid
        position={[0, -2.62, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1b2530"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#27384a"
        fadeDistance={38}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={7}
        maxDistance={28}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 + 0.12}
        autoRotate={!reducedMotion && !selectedId}
        autoRotateSpeed={0.45}
      />
    </Canvas>
  )
}
