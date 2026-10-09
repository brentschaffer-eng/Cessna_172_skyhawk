import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { ExplodedAircraft } from './ExplodedAircraft.jsx'
import { TextureLoader, SRGBColorSpace, DoubleSide } from 'three'

const SKY_COLOR = '#6ba3ff'
const UNITS_PER_NM = 400
// Wheel contact height: the model's tyres touch y = -1.25, and ExplodedAircraft lifts it by 0.35.
const AIRCRAFT_GROUND_Y = -0.9
const MAX_ZOOM = 16
const MIN_ZOOM = 3
// Each layer is a (2 * TILE_RADIUS + 1)^2 grid; the aircraft can sit anywhere in the
// center tile, so TILE_RADIUS whole tiles is the guaranteed coverage in every direction.
const TILE_RADIUS = 3
// The detailed layer is this many zoom levels sharper than the horizon layer.
const NEAR_LAYER_ZOOM_STEPS = 3
// Extra distance for the orbit camera, which can sit up to 50 units from the aircraft.
const CAMERA_MARGIN = 50

function MapTile({ tx, ty, z, dx, dy, size, renderOrder }) {
  const [texture, setTexture] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')
    let loaded = null
    let cancelled = false
    loader.load(
      url, 
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = SRGBColorSpace
        tex.anisotropy = 8
        tex.needsUpdate = true
        loaded = tex
        setTexture(tex)
      },
      undefined,
      (err) => {
        if (cancelled) return
        console.error('Failed to load tile:', url, err)
        setError(true)
      }
    )
    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [tx, ty, z])

  return (
    <mesh position={[dx * size + size / 2, -dy * size - size / 2, 0]} renderOrder={renderOrder}>
      <planeGeometry args={[size, size, 16, 16]} />
      <meshBasicMaterial
        key={texture ? 'tex' : 'notex'}
        map={texture || null}
        color={texture ? '#ffffff' : error ? '#aa3333' : '#3d5a3a'}
        side={DoubleSide}
        toneMapped={false}
        // Layers share one plane; draw order (not depth) decides which shows on top.
        depthWrite={false}
      />
    </mesh>
  )
}

function tileSizeAt(z, lat) {
  const tileWidthNm = (360 / Math.pow(2, z)) * 60 * Math.cos(lat * Math.PI / 180)
  return tileWidthNm * UNITS_PER_NM
}

// Picks the most detailed zoom whose tile grid still reaches `reach` units from the aircraft,
// with a little hysteresis so the imagery doesn't flicker when hovering near a boundary.
function useCoverageZoom(reach, lat) {
  const zoomRef = useRef(MAX_ZOOM)
  const covers = (z, margin = 1) => TILE_RADIUS * tileSizeAt(z, lat) >= reach * margin

  let z = zoomRef.current
  while (z > MIN_ZOOM && !covers(z)) z--
  while (z < MAX_ZOOM && covers(z + 1, 1.15)) z++
  zoomRef.current = z
  return z
}

function TileLayer({ z, lat, lon, renderOrder }) {
  const scale = Math.pow(2, z)
  const exactTileX = (lon + 180) / 360 * scale
  const exactTileY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale

  const centerTileX = Math.floor(exactTileX)
  const centerTileY = Math.floor(exactTileY)

  const fracX = exactTileX - centerTileX
  const fracY = exactTileY - centerTileY

  const size = tileSizeAt(z, lat)

  const tiles = []
  for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx++) {
    for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy++) {
      const ty = centerTileY + dy
      if (ty < 0 || ty >= scale) continue
      // Wrap across the antimeridian.
      const tx = (((centerTileX + dx) % scale) + scale) % scale
      tiles.push({ tx, ty, dx, dy })
    }
  }

  return (
    <group position={[-fracX * size, fracY * size, 0]}>
      {tiles.map(t => (
        <MapTile 
          key={`${z}-${t.tx}-${t.ty}`} 
          tx={t.tx} ty={t.ty} z={z} 
          dx={t.dx} dy={t.dy} 
          size={size} 
          renderOrder={renderOrder}
        />
      ))}
    </group>
  )
}

// A detailed layer under the aircraft plus a coarse layer that reaches the horizon, with
// zoom levels chosen from how far the ground must be visible at the current height.
function SlippyMap({ heading, lat, lon, groundY, viewDistance }) {
  const farZoom = useCoverageZoom(viewDistance + CAMERA_MARGIN, lat)
  const nearZoom = Math.min(MAX_ZOOM, farZoom + NEAR_LAYER_ZOOM_STEPS)

  return (
    <group position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, (heading * Math.PI) / 180]}>
      {farZoom !== nearZoom && <TileLayer z={farZoom} lat={lat} lon={lon} renderOrder={-2} />}
      <TileLayer z={nearZoom} lat={lat} lon={lon} renderOrder={-1} />
    </group>
  )
}

function CameraRange({ far }) {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.far = far
    camera.updateProjectionMatrix()
  }, [camera, far])
  return null
}

export function AircraftScene({ selectedId, onSelect, reducedMotion, controls, airportElevation, airportLat, airportLon }) {
  const heightAboveField = Math.max(0, (controls?.apAltitude || 3000) - (airportElevation || 3557)) / 10
  const groundY = AIRCRAFT_GROUND_Y - heightAboveField
  // Visibility grows with height so the ground stays in view all the way to the horizon;
  // at ground level these match the original 20/150 haze.
  const fogNear = 20 + 3 * heightAboveField
  const fogFar = 150 + 20 * heightAboveField

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8.5, 4.2, 9.5], fov: 42 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[SKY_COLOR]} />
      <fog attach="fog" args={[SKY_COLOR]} near={fogNear} far={fogFar} />
      <CameraRange far={fogFar * 1.5 + 1000} />

      <hemisphereLight args={['#dfeaff', '#5a5040', 0.45]} />
      <directionalLight
        position={[7, 11, 6]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <directionalLight position={[-8, 3, -7]} intensity={0.5} color="#9cbcff" />

      {/* Studio-style reflections for the glossy paint, glass and metal; generated locally, no HDR download. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#9ec3ff']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[0, 1.5, -10]} scale={[24, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[10, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[24, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[-10, 1.5, 0]} rotation-y={Math.PI / 2} scale={[24, 2.5, 1]} />
        <Lightformer form="rect" color="#6f7a5a" intensity={0.6} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <ExplodedAircraft
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          controls={controls}
        />
        <ContactShadows position={[0, groundY + 0.02, 0]} opacity={0.65} scale={16} blur={2.2} far={6} resolution={1024} />
        <SlippyMap 
          heading={controls?.apHeading || 0} 
          lat={(airportLat || 51.1215) + (controls?.apY || 0) / 60}
          lon={(airportLon || -114.0076) + (controls?.apX || 0) / (60 * Math.cos((airportLat || 51.1215) * Math.PI / 180))}
          groundY={groundY}
          // Fog is measured along the view axis, so cover extra to keep the haze edge off-screen.
          viewDistance={fogFar * 1.3}
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
