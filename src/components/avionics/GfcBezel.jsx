import { useState } from 'react'

/** AFCS keys on the left edge of the Skyhawk's GDU PFD bezel, top to bottom, in pairs. */
const BEZEL_ROWS = [
  ['AP', 'FD', 'APR', 'BC'],
  ['HDG', 'ALT', 'VS', 'FLC'],
  ['NAV', 'VNV', 'UP', 'DN'],
]
const KEY_LABELS = { UP: 'NOSE UP', DN: 'NOSE DN' }

/** Maps machine state onto the lamp each bezel key shows: off, white armed, green active. */
function lampState(id, ap) {
  switch (id) {
    case 'AP':
      return ap.ap ? 'active' : 'off'
    case 'FD':
      return ap.fd ? 'active' : 'off'
    case 'HDG':
      return ap.lateralActive === 'HDG' ? 'active' : 'off'
    case 'NAV':
    case 'APR':
      if (ap.lateralActive === id) return 'active'
      return ap.lateralArmed === id ? 'armed' : 'off'
    case 'ALT':
      return ap.verticalActive === 'ALT' ? 'active' : 'off'
    case 'VS':
    case 'FLC':
      return ap.verticalActive === id ? 'active' : 'off'
    default:
      return 'off'
  }
}

const LAMP_CLASS = {
  off: 'border-[#3a424d] bg-gradient-to-b from-[#2b323b] to-[#1c2229] text-slate-300',
  armed:
    'border-slate-200 bg-gradient-to-b from-[#404954] to-[#262d36] text-white shadow-[0_0_10px_-2px_rgba(230,237,243,0.7)]',
  active:
    'border-[var(--color-mode-active)] bg-gradient-to-b from-[#2f5c43] to-[#1d3a2b] text-[var(--color-mode-active)] shadow-[0_0_12px_-2px_var(--color-mode-active)]',
}

function ModeButton({ id, lamp, onPress }) {
  const label = KEY_LABELS[id] ?? id
  return (
    <button
      type="button"
      aria-pressed={lamp !== 'off'}
      aria-label={lamp === 'off' ? label : `${label}, ${lamp}`}
      onClick={() => onPress(id)}
      className={`flex h-9 flex-col items-center justify-center rounded-md border font-[family-name:var(--font-instrument)] text-xs font-bold tracking-wider transition-all active:translate-y-px ${LAMP_CLASS[lamp]}`}
    >
      <span className="leading-tight">{label}</span>
      {lamp !== 'off' && (
        <span className="text-[8px] font-semibold leading-none tracking-widest opacity-80" aria-hidden="true">
          {lamp === 'armed' ? 'ARMED' : 'ACTIVE'}
        </span>
      )}
    </button>
  )
}

export function GfcBezel({ ap, onPress, children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border border-[var(--color-panel-edge)] bg-gradient-to-b from-[#1a1f26] to-[#0f1318] p-3 shadow-inner">
      <div 
        className={`flex items-baseline justify-between cursor-pointer select-none ${collapsed ? '' : 'mb-2'}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="font-[family-name:var(--font-instrument)] text-xs tracking-[0.2em] text-slate-400 flex items-center">
          <span 
            className="mr-2 text-[10px] transition-transform duration-200" 
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}
          >
            ▼
          </span>
          GARMIN GFC 700
        </span>
        <span className="text-[10px] tracking-widest text-slate-600 uppercase">Mode controller</span>
      </div>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-1.5">
            {BEZEL_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-1.5">
                {row.map((id) => (
                  <ModeButton
                    key={id}
                    id={id}
                    lamp={lampState(id, ap)}
                    onPress={onPress}
                  />
                ))}
              </div>
            ))}
          </div>

          {children && <div className="mt-3 border-t border-[#262d38] pt-3">{children}</div>}
        </>
      )}
    </div>
  )
}
