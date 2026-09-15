import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'c172-trainer.speech'

/**
 * Chrome silently truncates utterances longer than roughly fifteen seconds, so
 * narration is split on sentence boundaries and queued as short chunks instead.
 */
const MAX_CHUNK_CHARS = 180

function chunkText(text) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  const chunks = []
  let current = ''

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHUNK_CHARS) {
      chunks.push(current.trim())
      current = ''
    }
    current += sentence
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

/**
 * Wraps window.speechSynthesis with queueing, voice selection and teardown.
 * Returns `supported: false` when the API is missing so callers can hide the UI.
 */
export function useSpeech() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const [voices, setVoices] = useState([])
  const [status, setStatus] = useState('idle') // idle | speaking | paused
  const [settings, setSettings] = useState(() => ({
    voiceURI: null,
    rate: 1,
    pitch: 1,
    ...loadSettings(),
  }))

  const queueRef = useRef([])
  const indexRef = useRef(0)
  // Invalidates callbacks from utterances cancelled by a newer request.
  const generationRef = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const read = () => {
      const list = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
      if (list.length) setVoices(list)
    }
    read()
    // Voices load asynchronously in Chrome and Edge.
    synth.addEventListener('voiceschanged', read)
    return () => synth.removeEventListener('voiceschanged', read)
  }, [supported])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const activeVoice = useMemo(() => {
    if (!voices.length) return null
    return voices.find((v) => v.voiceURI === settings.voiceURI) ?? voices.find((v) => v.default) ?? voices[0]
  }, [voices, settings.voiceURI])
  const activeVoiceRef = useRef(activeVoice)
  activeVoiceRef.current = activeVoice

  const speakFrom = useCallback(
    (startIndex) => {
      const synth = window.speechSynthesis
      const generation = ++generationRef.current
      synth.cancel()

      const run = (i) => {
        if (generation !== generationRef.current) return
        const chunk = queueRef.current[i]
        if (!chunk) {
          setStatus('idle')
          return
        }
        indexRef.current = i

        const utterance = new SpeechSynthesisUtterance(chunk)
        if (activeVoiceRef.current) utterance.voice = activeVoiceRef.current
        utterance.rate = settingsRef.current.rate
        utterance.pitch = settingsRef.current.pitch
        utterance.onend = () => {
          if (generation !== generationRef.current) return
          run(i + 1)
        }
        utterance.onerror = (event) => {
          if (generation !== generationRef.current) return
          if (event.error === 'interrupted' || event.error === 'canceled') return
          setStatus('idle')
        }
        synth.speak(utterance)
      }

      // cancel() is asynchronous in Chrome; speaking in the same tick can drop the utterance.
      setStatus('speaking')
      setTimeout(() => run(startIndex), 60)
    },
    [],
  )

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return
      queueRef.current = chunkText(text)
      speakFrom(0)
    },
    [supported, speakFrom],
  )

  const pause = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [supported])

  const resume = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.resume()
    setStatus('speaking')
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    generationRef.current++
    queueRef.current = []
    indexRef.current = 0
    window.speechSynthesis.cancel()
    setStatus('idle')
  }, [supported])

  const updateSettings = useCallback(
    (patch) => {
      const next = { ...settingsRef.current, ...patch }
      settingsRef.current = next
      setSettings(next)
      // Rate, pitch and voice only apply to new utterances, so restart the current chunk.
      if (statusRef.current !== 'idle') speakFrom(indexRef.current)
    },
    [speakFrom],
  )

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const onHide = () => {
      if (document.hidden) synth.cancel()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      generationRef.current++
      synth.cancel()
    }
  }, [supported])

  return {
    supported,
    status,
    voices,
    voice: activeVoice,
    rate: settings.rate,
    pitch: settings.pitch,
    speak,
    pause,
    resume,
    stop,
    updateSettings,
  }
}
