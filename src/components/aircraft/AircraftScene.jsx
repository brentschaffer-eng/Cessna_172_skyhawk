import { Suspense, memo, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Aircraft } from './Aircraft.jsx'
import { TextureLoader, SRGBColorSpace, DoubleSide, PlaneGeometry } from 'three'

const SKY_COLOR = '#6ba3ff'
const UNITS_PER_NM = 400
// Wheel contact height: the model's tyres touch y = -1.25, and Aircraft lifts it by 0.35.
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
// Calgary, used when no airport position is passed in.
const DEFAULT_ORIGIN = { lat: 51.1215, lon: -114.0076 }

const DEG = Math.PI / 180

/**
 * Where the aircraft is right now, for the frame loop. Reads the live simulation state from
 * `simRef` (no React render involved); without one, the aircraft is parked at the origin.
 */
function readPose(simRef, origin) {
  const s = simRef?.current
  if (!s) return { height: 0, heading: 0, pitch: 0, bank: 0, lat: origin.lat, lon: origin.lon }
  return {
    // Scene units above the field: 10 ft of altitude per unit.
    height: Math.max(0, s.altitude - s.runway.elevation) / 10,
    heading: s.heading,
    pitch: s.pitch,
    bank: s.bank,
    lat: origin.lat + s.y / 60,
    lon: origin.lon + s.x / (60 * Math.cos(origin.lat * DEG)),
  }
}

// Visibility grows with height so the ground stays in view all the way to the horizon;
// at ground level these match the original 20/150 haze.
const fogNearAt = (height) => 20 + 3 * height
const fogFarAt = (height) => 150 + 20 * height

// Every tile is the same flat square, scaled to size, so they can share one geometry.
const TILE_GEOMETRY = new PlaneGeometry(1, 1)

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
    <mesh
      geometry={TILE_GEOMETRY}
      position={[dx * size + size / 2, -dy * size - size / 2, 0]}
      scale={[size, size, 1]}
      renderOrder={renderOrder}
    >
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
  const tileWidthNm = (360 / Math.pow(2, z)) * 60 * Math.cos(lat * DEG)
  return tileWidthNm * UNITS_PER_NM
}

/** Fractional slippy-map tile coordinates of a position at zoom `z` (Web Mercator). */
function tileCoords(z, lat, lon) {
  const scale = Math.pow(2, z)
  const x = ((lon + 180) / 360) * scale
  const y = ((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * scale
  return { x, y }
}

// Picks the most detailed zoom whose tile grid still reaches `reach` units from the aircraft,
// with a little hysteresis (relative to `current`) so the imagery doesn't flicker when
// hovering near a boundary.
function coverageZoom(current, reach, lat) {
  const covers = (z, margin = 1) => TILE_RADIUS * tileSizeAt(z, lat) >= reach * margin
  let z = current
  while (z > MIN_ZOOM && !covers(z)) z--
  while (z < MAX_ZOOM && covers(z + 1, 1.15)) z++
  return z
}

/**
 * One zoom level of ground imagery. The grid slides under the aircraft every frame by moving
 * the group; React only re-renders when the aircraft crosses into a different centre tile.
 */
function TileLayer({ z, simRef, origin, renderOrder }) {
  const groupRef = useRef()
  // The centre tile and the tile size it was laid out with; null until the first frame.
  const [grid, setGrid] = useState(null)

  useFrame(() => {
    const pose = readPose(simRef, origin)
    const exact = tileCoords(z, pose.lat, pose.lon)
    const x = Math.floor(exact.x)
    const y = Math.floor(exact.y)
    if (!grid || grid.x !== x || grid.y !== y) {
      setGrid({ x, y, size: tileSizeAt(z, pose.lat) })
    }
    // Correct even on the frame before a re-centre lands, because it is relative to `grid`.
    if (grid) groupRef.current.position.set(-(exact.x - grid.x) * grid.size, (exact.y - grid.y) * grid.size, 0)
  })

  const tiles = []
  if (grid) {
    const scale = Math.pow(2, z)
    for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx++) {
      for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy++) {
        const ty = grid.y + dy
        if (ty < 0 || ty >= scale) continue
        // Wrap across the antimeridian.
        const tx = (((grid.x + dx) % scale) + scale) % scale
        tiles.push({ tx, ty, dx, dy })
      }
    }
  }

  return (
    <group ref={groupRef}>
      {tiles.map((t) => (
        <MapTile
          key={`${z}-${t.tx}-${t.ty}`}
          tx={t.tx} ty={t.ty} z={z}
          dx={t.dx} dy={t.dy}
          size={grid.size}
          renderOrder={renderOrder}
        />
      ))}
    </group>
  )
}

// A detailed layer under the aircraft plus a coarse layer that reaches the horizon, with
// zoom levels chosen from how far the ground must be visible at the current height.
function SlippyMap({ simRef, origin }) {
  const groupRef = useRef()
  const [farZoom, setFarZoom] = useState(MAX_ZOOM)
  const nearZoom = Math.min(MAX_ZOOM, farZoom + NEAR_LAYER_ZOOM_STEPS)

  useFrame(() => {
    const pose = readPose(simRef, origin)
    // The world turns under the aircraft, which always points down -Z.
    groupRef.current.rotation.z = pose.heading * DEG
    // Fog is measured along the view axis, so cover extra to keep the haze edge off-screen.
    const reach = fogFarAt(pose.height) * 1.3 + CAMERA_MARGIN
    const next = coverageZoom(farZoom, reach, pose.lat)
    if (next !== farZoom) setFarZoom(next)
  })

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {farZoom !== nearZoom && (
        <TileLayer key={farZoom} z={farZoom} simRef={simRef} origin={origin} renderOrder={-2} />
      )}
      <TileLayer key={nearZoom} z={nearZoom} simRef={simRef} origin={origin} renderOrder={-1} />
    </group>
  )
}

/** Drops the ground away as the aircraft climbs, and opens up the haze and far plane with it. */
function Ground({ simRef, origin, children }) {
  const groupRef = useRef()

  useFrame(({ camera, scene }) => {
    const { height } = readPose(simRef, origin)
    groupRef.current.position.y = AIRCRAFT_GROUND_Y - height

    const fogFar = fogFarAt(height)
    if (scene.fog) {
      scene.fog.near = fogNearAt(height)
      scene.fog.far = fogFar
    }
    const cameraFar = fogFar * 1.5 + 1000
    if (camera.far !== cameraFar) {
      camera.far = cameraFar
      camera.updateProjectionMatrix()
    }
  })

  return <group ref={groupRef} position={[0, AIRCRAFT_GROUND_Y, 0]}>{children}</group>
}

/**
 * Shifts the projection centre left by half of `right` pixels, so the aircraft sits in the middle
 * of the area left uncovered by an overlay docked on the right edge. The camera renders a wider
 * virtual frame and shows only its right-hand part, keeping the image undistorted.
 */
function ViewInset({ right }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  // three.js cameras are mutable by design; this is the supported way to reframe one.
  /* eslint-disable react-hooks/immutability */
  useLayoutEffect(() => {
    if (right > 0 && size.width > right * 2) {
      // r3f resets aspect to the canvas size on resize; this effect re-runs afterwards.
      camera.aspect = (size.width + right) / size.height
      camera.setViewOffset(size.width + right, size.height, right, 0, size.width, size.height)
    } else {
      camera.aspect = size.width / size.height
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, right])
  /* eslint-enable react-hooks/immutability */
  return null
}

/**
 * The 3D view. In the simulator, pass `simRef` (the live simulation state) and the airport's
 * position as `originLat` / `originLon`: attitude, height and ground position are then read
 * from the ref every frame, so flying never re-renders this component. It is memoised for
 * that reason; keep its props stable.
 */
export const AircraftScene = memo(function AircraftScene({
  controls,
  simRef,
  originLat = DEFAULT_ORIGIN.lat,
  originLon = DEFAULT_ORIGIN.lon,
  viewInsetRight = 0,
}) {
  const origin = useMemo(() => ({ lat: originLat, lon: originLon }), [originLat, originLon])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8.5, 4.2, 9.5], fov: 42 }}
    >
      <color attach="background" args={[SKY_COLOR]} />
      <fog attach="fog" args={[SKY_COLOR, fogNearAt(0), fogFarAt(0)]} />
      <ViewInset right={viewInsetRight} />

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
        <Aircraft controls={controls} simRef={simRef} />
        <Ground simRef={simRef} origin={origin}>
          <ContactShadows position={[0, 0.02, 0]} opacity={0.65} scale={16} blur={2.2} far={6} resolution={1024} />
          <SlippyMap simRef={simRef} origin={origin} />
        </Ground>
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
})
