import { useState } from 'react'
import { useSpeechContext } from './speechContext.js'

const BTN =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M4 2.5v11l9.5-5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="currentColor">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
    </svg>
  )
}

/**
 * Play / pause / stop transport plus the voice settings disclosure.
 * `text` is the full narration for the currently displayed panel.
 */
export function SpeechBar({ text, label }) {
  const { supported, status, speak, pause, resume, stop, voices, voice, rate, pitch, updateSettings } =
    useSpeechContext()
  const [showSettings, setShowSettings] = useState(false)

  if (!supported) {
    return (
      <p className="rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] px-3 py-2 text-xs text-slate-400">
        Audio narration is unavailable — this browser does not support the Web Speech API.
      </p>
    )
  }

  const idle = status === 'idle'

  return (
    <div className="rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${BTN} bg-[var(--color-instrument)] text-slate-900 hover:bg-amber-300`}
          onClick={() => (status === 'paused' ? resume() : speak(text))}
        >
          <PlayIcon />
          {status === 'paused' ? 'Resume' : 'Play Audio'}
        </button>

        <button
          type="button"
          className={`${BTN} bg-slate-700 text-slate-100 hover:bg-slate-600`}
          onClick={pause}
          disabled={status !== 'speaking'}
        >
          <PauseIcon />
          Pause
        </button>

        <button
          type="button"
          className={`${BTN} bg-slate-700 text-slate-100 hover:bg-slate-600`}
          onClick={stop}
          disabled={idle}
        >
          <StopIcon />
          Stop
        </button>

        <button
          type="button"
          className={`${BTN} ml-auto text-slate-300 hover:text-[var(--color-instrument)]`}
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
        >
          Voice settings
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400" aria-live="polite">
        {idle
          ? `Ready to narrate: ${label}`
          : status === 'paused'
            ? 'Narration paused'
            : `Narrating: ${label}`}
      </p>

      {showSettings && (
        <div className="mt-3 grid gap-3 border-t border-[var(--color-panel-edge)] pt-3 sm:grid-cols-3">
          <label className="text-xs text-slate-400">
            Voice
            <select
              className="mt-1 w-full rounded border border-[var(--color-panel-edge)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-slate-200"
              value={voice?.voiceURI ?? ''}
              onChange={(e) => updateSettings({ voiceURI: e.target.value })}
            >
              {voices.length === 0 && <option value="">Loading voices…</option>}
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            Rate — {rate.toFixed(1)}×
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={rate}
              onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-instrument)]"
            />
          </label>

          <label className="text-xs text-slate-400">
            Pitch — {pitch.toFixed(1)}
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => updateSettings({ pitch: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-instrument)]"
            />
          </label>
        </div>
      )}
    </div>
  )
}
