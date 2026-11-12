import { useEffect, useRef } from 'react'

const TONE = {
  success: 'border-[var(--color-mode-active)] text-[var(--color-mode-active)]',
  danger: 'border-red-400 text-red-300',
}

const BTN =
  'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors'

/**
 * The simulation stops while it has something to say (minimums reached, flown into terrain).
 * This shows the message over its container and offers the two ways forward.
 */
export function SimMessage({ message, onContinue, onReset }) {
  const continueRef = useRef(null)

  useEffect(() => {
    if (!message) return
    continueRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [message, onContinue])

  if (!message) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sim-message-title"
        aria-describedby="sim-message-body"
        className={`w-full max-w-md rounded-xl border bg-[var(--color-panel-raised)] p-5 shadow-2xl ${TONE[message.tone] ?? TONE.success}`}
      >
        <h2 id="sim-message-title" className="font-[family-name:var(--font-instrument)] text-base font-bold tracking-wide">
          {message.title}
        </h2>
        <p id="sim-message-body" className="mt-2 text-sm leading-relaxed text-slate-300">
          {message.body}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className={`${BTN} border-[var(--color-panel-edge)] text-slate-200 hover:border-slate-500`}
          >
            Reset flight
          </button>
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className={`${BTN} border-[var(--color-instrument)] bg-[var(--color-instrument)] text-slate-900 hover:brightness-110`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
