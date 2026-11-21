export function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-ink)]/80">{label}</span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-white px-2 py-1.5 tabular-nums outline-none focus:border-[var(--color-moss)]"
      />
    </label>
  )
}
