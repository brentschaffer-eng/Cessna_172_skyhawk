import { useCallback, useEffect, useRef, useState } from 'react'
import { autopilotReducer } from '../state/autopilotReducer.js'

/** React re-renders the instruments at this interval; the simulation itself runs every frame. */
const PUBLISH_INTERVAL_MS = 33
const MAX_FRAME_GAP_S = 1
const NO_INPUT ={ pilot: { roll: 0, pitch: 0 }, flapsDown: false }

/**
 * Runs the flight simulation outside React's render cycle.
 *
 * The authoritative state lives in `simRef` and advances on every animation frame. The 3D
 * scene reads it straight from the ref inside its own frame loop, so it moves at the full
 * display rate without re-rendering any components. React only receives a snapshot about 30
 * times a second (and immediately after every user action), which is plenty for the PFD.
 *
 * @param {() => object} createInitialState
 * @param {{ current: { pilot: { roll: number, pitch: number }, flapsDown: boolean } }} [inputsRef]
 *   live control inputs, read each frame
 */
export function useSimulation(createInitialState, inputsRef) {
  const [initial] = useState(createInitialState)
  const simRef = useRef(initial)
  const [snapshot, setSnapshot] = useState(initial)

  const dispatch = useCallback((action) => {
    simRef.current = autopilotReducer(simRef.current, action)
    setSnapshot(simRef.current)
  }, [])

  useEffect(() => {
    let frameId
    let last = performance.now()
    let lastPublish = 0

    const loop = (time) => {
      const dt = (time - last) / 1000
      last = time
      // A long gap means the tab was in the background; skip it rather than lurch forward.
      // Merely slow frames still count: the reducer caps each step at 0.1 s, so a struggling
      // device flies in slow motion instead of freezing.
      if (dt > 0 && dt < MAX_FRAME_GAP_S) {
        const { pilot, flapsDown } = inputsRef?.current ?? NO_INPUT
        simRef.current = autopilotReducer(simRef.current, { type: 'tick', dt, pilot, flapsDown })
      }
      if (time - lastPublish >= PUBLISH_INTERVAL_MS) {
        lastPublish = time
        setSnapshot(simRef.current) // A no-op for React when nothing changed (paused).
      }
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [inputsRef])

  return [snapshot, dispatch, simRef]
}
