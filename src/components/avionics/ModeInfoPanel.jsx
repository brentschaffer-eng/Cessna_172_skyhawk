import { modeNarration } from '../../data/autopilotModes.js'
import { SpeechBar } from '../speech/SpeechBar.jsx'

export function ModeInfoPanel({ mode }) {
  if (!mode) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-panel-edge)] bg-[var(--color-panel)] p-6">
        <h2 className="text-base font-semibold text-slate-200">Press a mode key</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Each key on the GFC 700 mode controller drives the simulated flight director and opens a
          breakdown of what it commands, what you see on the PFD, and when a pilot reaches for it.
        </p>
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-4">
      <header>
        <h2 className="font-[family-name:var(--font-instrument)] text-lg font-bold tracking-wider text-slate-100">
          {mode.label}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{mode.tagline}</p>
      </header>

      <SpeechBar text={modeNarration(mode)} label={`${mode.label} mode`} />

      <div className="flex flex-col gap-4">
        {mode.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="font-[family-name:var(--font-instrument)] text-xs tracking-widest text-[var(--color-instrument)] uppercase">
              {section.heading}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
