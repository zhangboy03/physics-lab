interface EnergyBarProps {
  kinetic: number
  potential: number
  total: number
  maxEnergy: number
}

export default function EnergyBar({
  kinetic,
  potential,
  total,
  maxEnergy,
}: EnergyBarProps) {
  const limit = Math.max(maxEnergy, kinetic, potential, total, 0.001)
  const barHeight = 148

  const items = [
    { label: '动能', value: kinetic, color: 'var(--color-energy-kinetic)' },
    { label: '势能', value: potential, color: 'var(--color-energy-potential)' },
    { label: '总能', value: total, color: 'var(--color-energy-total)' },
  ]

  return (
    <div className="lab-panel rounded-[1.5rem] p-5">
      <div className="panel-caption">Energy Exchange</div>
      <h4 className="mt-2 text-[20px] font-semibold text-[var(--color-ink)]">能量分布</h4>
      <div className="paper-rule mt-5" />

      <div className="mt-5 flex items-end justify-between gap-4" style={{ height: barHeight + 54 }}>
        {items.map(item => (
          <div key={item.label} className="flex flex-1 flex-col items-center">
            <div className="mono-data text-[12px] font-semibold text-[var(--color-ink)]">
              {item.value.toFixed(2)}
            </div>
            <div
              className="mt-3 flex w-full max-w-[72px] items-end rounded-t-[1rem] rounded-b-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.52)] px-1.5 pb-1.5"
              style={{ height: barHeight }}
            >
              <div
                className="w-full rounded-[0.8rem] transition-[height] duration-200 ease-out"
                style={{
                  height: `${Math.max(8, (item.value / limit) * (barHeight - 12))}px`,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${item.color} 78%, white), ${item.color})`,
                }}
              />
            </div>
            <div className="mt-3 text-[12px] font-medium text-[var(--color-ink-soft)]">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
