import { annunciations } from '../../state/autopilotReducer.js'

function Chip({ text, tone }) {
  const tones = {
    active: 'text-[var(--color-mode-active)]',
    armed: 'text-[var(--color-mode-armed)]',
    idle: 'text-slate-600',
  }
  return (
    <span className={`font-[family-name:var(--font-instrument)] text-sm font-bold ${tones[tone]}`}>
      {text}
    </span>
  )
}

/** Attitude with magenta flight-director bars, driven by whichever modes are active. */
function MiniAttitude({ ap }) {
  const bank = ['HDG', 'NAV', 'APR'].includes(ap.lateralActive) ? 14 : 0
  const pitch =
    ap.verticalActive === 'VS' || ap.verticalActive === 'FLC'
      ? -14
      : ap.verticalActive === 'GS'
        ? 10
        : 0

  return (
    <svg viewBox="0 0 220 120" className="h-28 w-full" role="img" aria-label="Simulated attitude indicator">
      <defs>
        <clipPath id="pfd-clip">
          <rect x="10" y="10" width="200" height="100" rx="6" />
        </clipPath>
      </defs>
      <g clipPath="url(#pfd-clip)">
        <g transform={`rotate(${-bank} 110 60) translate(0 ${pitch})`}>
          <rect x="-90" y="-80" width="400" height="140" fill="#2b6ca3" />
          <rect x="-90" y="60" width="400" height="160" fill="#7a4a1e" />
          <line x1="-90" y1="60" x2="310" y2="60" stroke="#e6edf3" strokeWidth="2" />
        </g>
      </g>
      <rect x="10" y="10" width="200" height="100" rx="6" fill="none" stroke="#39414c" />

      {/* Fixed aircraft symbol */}
      <path d="M70 60 h26 M124 60 h26 M110 60 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" stroke="#f0b429" strokeWidth="3" fill="none" />

      {/* Flight director command bars */}
      {ap.fd && (
        <path
          d={`M72 ${66 + pitch * 0.5} L110 ${58 + pitch * 0.5} L148 ${66 + pitch * 0.5}`}
          stroke="#e879f9"
          strokeWidth="4"
          fill="none"
          transform={`rotate(${-bank} 110 60)`}
        />
      )}
    </svg>
  )
}

export function PfdAnnunciator({ ap }) {
  const a = annunciations(ap)

  return (
    <div className="rounded-xl border border-[var(--color-panel-edge)] bg-[#05080c] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[#2a323c] bg-[#0b1016] px-3 py-2">
        <div className="flex items-center gap-3">
          <Chip text={a.lateralActive} tone="active" />
          <Chip text={a.lateralArmed.join(' ') || '—'} tone={a.lateralArmed.length ? 'armed' : 'idle'} />
        </div>

        <Chip text={a.ap ? 'AP' : a.fd ? 'FD' : 'AFCS OFF'} tone={a.ap || a.fd ? 'active' : 'idle'} />

        <div className="flex items-center gap-3">
          <Chip text={a.verticalActive} tone="active" />
          <Chip
            text={a.verticalArmed.join(' ') || '—'}
            tone={a.verticalArmed.length ? 'armed' : 'idle'}
          />
        </div>
      </div>

      <MiniAttitude ap={ap} />

      <p className="mt-1 text-center text-[11px] text-slate-500">
        Green is active. White is armed and waiting to capture.
      </p>
    </div>
  )
}
