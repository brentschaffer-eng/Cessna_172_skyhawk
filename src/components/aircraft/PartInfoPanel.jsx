import { partNarration } from '../../data/aircraftParts.js'
import { SpeechBar } from '../speech/SpeechBar.jsx'

export function PartInfoPanel({ part }) {
  if (!part) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-panel-edge)] bg-[var(--color-panel)] p-6">
        <h2 className="text-base font-semibold text-slate-200">Select an assembly</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Click a section of the aircraft, or pick one from the list, to pull it out of the airframe
          and read how it works. Drag to orbit the model and scroll to zoom.
        </p>
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-4">
      <header>
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: part.accent }}
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold text-slate-100">{part.label}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">{part.tagline}</p>
      </header>

      <SpeechBar text={partNarration(part)} label={part.label} />

      <div className="flex flex-col gap-4">
        {part.sections.map((section) => (
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
