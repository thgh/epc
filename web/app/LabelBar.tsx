import { LABEL_BANDS } from '../../calc/label'

const COLORS: Record<string, string> = {
  'A+': '#009640',
  A: '#52b035',
  B: '#c8d400',
  C: '#f6eb0f',
  D: '#f0b400',
  E: '#eb6e00',
  F: '#e30613',
}

export function LabelBar({ score, className = '' }: { score: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, ((score + 50) / 600) * 100))
  return (
    <div className={className}>
      <div className="flex h-3 overflow-hidden rounded-sm">
        {LABEL_BANDS.map((b) => (
          <div
            key={b.label}
            className="flex-1"
            style={{ background: COLORS[b.label] }}
            title={b.label}
          />
        ))}
      </div>
      <div className="relative mt-1 h-3">
        <div
          className="absolute top-0 h-3 w-0.5 bg-white shadow"
          style={{ left: `calc(${pct}% - 1px)` }}
        />
      </div>
    </div>
  )
}
