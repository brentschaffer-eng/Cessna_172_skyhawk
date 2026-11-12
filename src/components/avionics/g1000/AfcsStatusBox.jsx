import { G, T } from './symbology.jsx'

export function AfcsStatusBox({ ap, apAlert, apAlertBlink, fd, lateralActive, lateralArmed, verticalActive, reference, verticalArmed, flashLateral, flashVertical }) {
  const cx = 512
  const w = 400
  const h = 40
  const x = cx - w / 2
  const y = 30

  // Colors
  const activeColor = G.green
  const armedColor = G.white
  
  const renderField = (fieldX, active, armed, flash) => (
    <g>
      {flash && (
        <rect x={fieldX - 50} y={y + 2} width="100" height={h - 4} fill={activeColor} />
      )}
      <T x={fieldX} y={y + 20} size={18} anchor="middle" fill={flash ? G.box : activeColor}>
        {active}
      </T>
      <T x={fieldX + (active.includes(' ') ? 0 : 35)} y={y + 20} size={16} anchor="start" fill={armedColor}>
        {armed}
      </T>
    </g>
  )

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={G.box} stroke={G.white} strokeWidth="1.5" />
      <line x1={x + 130} x2={x + 130} y1={y} y2={y + h} stroke={G.white} strokeWidth="1.5" />
      <line x1={x + 270} x2={x + 270} y1={y} y2={y + h} stroke={G.white} strokeWidth="1.5" />

      {/* Lateral Modes */}
      {renderField(x + 50, lateralActive, lateralArmed, flashLateral)}

      {/* AP/FD Status */}
      <T x={cx} y={y + 20} size={18} anchor="middle" fill={apAlert ? G.yellow : activeColor}>
        {apAlert ? (apAlertBlink ? 'AP' : '') : ap ? 'AP' : ''}
      </T>
      <T x={cx} y={y + 36} size={18} anchor="middle" fill={activeColor}>
        {fd && !ap ? 'FD' : ''}
      </T>

      {/* Vertical Modes */}
      <g>
        {flashVertical && (
          <rect x={x + 272} y={y + 2} width="126" height={h - 4} fill={activeColor} />
        )}
        <T x={x + 280} y={y + 26} size={18} anchor="start" fill={flashVertical ? G.box : activeColor}>
          {verticalActive}
        </T>
        {/* Right-aligned and slightly smaller so long references such as ↑1000FPM stay inside the box. */}
        <T x={x + w - 6} y={y + 26} size={15} anchor="end" fill={flashVertical ? G.box : activeColor}>
          {reference}
        </T>
        <T x={x + 280} y={y + 12} size={14} anchor="start" fill={armedColor}>
          {verticalArmed}
        </T>
      </g>
    </g>
  )
}
