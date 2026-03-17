import type { ReactNode } from 'react'
import type { ParamDef } from '../experiments/types'

interface ControlPanelProps {
  params: ParamDef[]
  values: Record<string, number>
  onChange: (key: string, value: number) => void
  running: boolean
  onToggle: () => void
  onReset: () => void
  children?: ReactNode
}

function formatValue(value: number, step: number) {
  if (step >= 1) return value.toFixed(0)
  if (step >= 0.1) return value.toFixed(1)
  return value.toFixed(2)
}

export default function ControlPanel({
  params,
  values,
  onChange,
  running,
  onToggle,
  onReset,
  children,
}: ControlPanelProps) {
  return (
    <div className="lab-panel rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="panel-caption">Parameter Console</div>
          <h3 className="mt-2 text-[20px] font-semibold text-[var(--color-ink)]">参数控制</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={`control-button px-4 py-2 text-[13px] font-semibold ${
              running ? 'is-danger' : 'is-primary'
            }`}
          >
            {running ? '暂停' : '播放'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="control-button px-4 py-2 text-[13px] font-medium"
          >
            重置
          </button>
        </div>
      </div>

      <div className="paper-rule mt-5" />

      <div className="mt-5 space-y-5">
        {params.map(param => (
          <div key={param.key}>
            <div className="mb-2 flex items-start justify-between gap-4">
              <label className="text-[14px] font-medium text-[var(--color-ink)]">
                {param.label}
              </label>
              <div className="mono-data text-[13px] font-semibold text-[var(--color-ink)]">
                {formatValue(values[param.key] ?? param.defaultValue, param.step)}
                <span className="ml-1 text-[var(--color-ink-soft)]">{param.unit}</span>
              </div>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={values[param.key] ?? param.defaultValue}
              onChange={event => onChange(param.key, Number.parseFloat(event.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-[11px] text-[var(--color-ink-soft)]">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
        ))}
      </div>

      {children ? (
        <>
          <div className="paper-rule mt-5" />
          <div className="mt-5 space-y-4">{children}</div>
        </>
      ) : null}
    </div>
  )
}
