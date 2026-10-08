import { useState } from 'react'
import { BEZEL_ROWS, MODE_BY_ID } from '../../data/autopilotModes.js'

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

function ModeButton({ mode, lamp, focused, onPress, onFocus }) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={lamp !== 'off'}
        onClick={() => {
          onPress(mode.id)
          onFocus(mode.id)
        }}
        className={`h-10 rounded-md border font-[family-name:var(--font-instrument)] text-xs font-bold tracking-wider transition-all active:translate-y-px ${LAMP_CLASS[lamp]} ${
          focused ? 'ring-2 ring-[var(--color-instrument)] ring-offset-2 ring-offset-[#0d1117]' : ''
        }`}
      >
        {mode.label}
      </button>
      <span className="text-center text-[10px] text-slate-500">
        {lamp === 'armed' ? 'ARMED' : lamp === 'active' ? 'ACTIVE' : '\u00a0'}
      </span>
    </div>
  )
}

export function GfcBezel({ ap, selectedId, onPress, onSelect }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border border-[var(--color-panel-edge)] bg-gradient-to-b from-[#1a1f26] to-[#0f1318] p-4 shadow-inner">
      <div 
        className={`flex items-baseline justify-between cursor-pointer select-none ${collapsed ? '' : 'mb-3'}`}
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
                    mode={MODE_BY_ID[id]}
                    lamp={lampState(id, ap)}
                    focused={selectedId === id}
                    onPress={onPress}
                    onFocus={onSelect}
                  />
                ))}
              </div>
            ))}
          </div>


        </>
      )}
    </div>
  )
}
