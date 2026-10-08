import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { ExplodedAircraft } from './ExplodedAircraft.jsx'
import { TextureLoader, SRGBColorSpace, DoubleSide } from 'three'

function MapTile({ tx, ty, z, dx, dy, size }) {
  const [texture, setTexture] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      url, 
      (tex) => {
        tex.colorSpace = SRGBColorSpace
        tex.anisotropy = 8
        tex.needsUpdate = true
        setTexture(tex)
      },
      undefined,
      (err) => {
        console.error('Failed to load tile:', url, err)
        setError(true)
      }
    )
  }, [tx, ty, z])

  return (
    <mesh position={[dx * size + size / 2, -dy * size - size / 2, 0]}>
      <planeGeometry args={[size, size, 16, 16]} />
      <meshBasicMaterial
        key={texture ? 'tex' : 'notex'}
        map={texture || null}
        color={texture ? '#ffffff' : error ? '#aa3333' : '#3d5a3a'}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

function SlippyMap({ heading, lat, lon, groundY }) {
  const z = 16;
  const exactTileX = (lon + 180) / 360 * Math.pow(2, z);
  const exactTileY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z);
  
  const centerTileX = Math.floor(exactTileX);
  const centerTileY = Math.floor(exactTileY);

  const fracX = exactTileX - centerTileX;
  const fracY = exactTileY - centerTileY;

  const tileWidthNm = (360 / Math.pow(2, z)) * 60 * Math.cos(lat * Math.PI / 180);
  const TILE_SIZE = tileWidthNm * 400;

  const tiles = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      tiles.push({ tx: centerTileX + dx, ty: centerTileY + dy, dx, dy, z });
    }
  }

  return (
    <group position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, (heading * Math.PI) / 180]}>

      <group position={[-fracX * TILE_SIZE, fracY * TILE_SIZE, 0]}>
        {tiles.map(t => (
          <MapTile 
            key={`${t.z}-${t.tx}-${t.ty}`} 
            tx={t.tx} ty={t.ty} z={t.z} 
            dx={t.dx} dy={t.dy} 
            size={TILE_SIZE} 
          />
        ))}
      </group>
    </group>
  )
}

export function AircraftScene({ selectedId, onSelect, reducedMotion, controls, airportElevation, airportLat, airportLon }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8.5, 4.2, 9.5], fov: 42 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#6ba3ff']} />
      <fog attach="fog" args={['#6ba3ff', 20, 150]} />

      <hemisphereLight args={['#ffffff', '#444444', 0.8]} />
      <directionalLight
        position={[7, 11, 6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <directionalLight position={[-8, 3, -7]} intensity={0.55} color="#7aa7ff" />

      <Suspense fallback={null}>
        <ExplodedAircraft
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          controls={controls}
        />
        <ContactShadows position={[0, -2.58, 0]} opacity={0.6} scale={26} blur={2.6} far={6} />
        <SlippyMap 
          heading={controls?.apHeading || 0} 
          lat={(airportLat || 51.1215) + (controls?.apY || 0) / 60}
          lon={(airportLon || -114.0076) + (controls?.apX || 0) / (60 * Math.cos((airportLat || 51.1215) * Math.PI / 180))}
          groundY={-2.6 - Math.max(0, (controls?.apAltitude || 3000) - (airportElevation || 3557)) / 10}
        />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={7}
        maxDistance={50}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
        autoRotate={false}
        autoRotateSpeed={0.45}
      />
    </Canvas>
  )
}
