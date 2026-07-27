export interface MetricTileProps {
  value: string | number
  label: string
  valueClassName?: string
}

export function MetricTile({ value, label, valueClassName }: MetricTileProps) {
  return (
    <div className="rounded-home-xl border border-home-border bg-home-surface p-[13px_14px]">
      <div
        className={`font-home-mono text-[24px] leading-none ${valueClassName ?? 'text-home-text-strong'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
      <div className="mt-[7px] font-home-mono text-[9.5px] tracking-[.14em] text-home-dim">{label}</div>
    </div>
  )
}
