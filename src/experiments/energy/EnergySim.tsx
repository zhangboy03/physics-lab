import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import EnergyBar from '../../components/EnergyBar'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const g = 9.8

const paramDefs: ParamDef[] = [
  { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, defaultValue: 1.5, unit: 'kg' },
  { key: 'h', label: '初始高度 h', min: 0.5, max: 5, step: 0.1, defaultValue: 2.5, unit: 'm' },
  { key: 'angle', label: '斜面角 α', min: 15, max: 55, step: 1, defaultValue: 30, unit: '°' },
  { key: 'mu', label: '摩擦系数 μ', min: 0, max: 0.5, step: 0.01, defaultValue: 0.08, unit: '' },
  { key: 'duration', label: '观察时长', min: 2, max: 10, step: 0.5, defaultValue: 5, unit: 's' },
]

const formulas = [
  String.raw`W_{\text{net}} = \Delta E_k`,
  String.raw`E_k + E_p = \text{const} \quad (\mu = 0)`,
  String.raw`W_f = \mu mg\cos\alpha \cdot s`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function EnergySim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
  })

  const angleRad = (values.angle * Math.PI) / 180
  const slopeLength = values.h / Math.sin(angleRad)
  const acceleration = Math.max(0, g * (Math.sin(angleRad) - values.mu * Math.cos(angleRad)))
  const travel = Math.min(slopeLength, 0.5 * acceleration * time * time)
  const velocity = travel >= slopeLength ? Math.sqrt(2 * acceleration * slopeLength) : acceleration * time
  const currentHeight = Math.max(0, values.h - travel * Math.sin(angleRad))
  const kinetic = 0.5 * values.m * velocity * velocity
  const potential = values.m * g * currentHeight
  const frictionLoss = values.mu * values.m * g * Math.cos(angleRad) * travel
  const mechanical = kinetic + potential
  const totalInitial = values.m * g * values.h

  const samples = useMemo(
    () =>
      Array.from({ length: 140 }, (_, index) => {
        const t = (values.duration * index) / 139
        const s = Math.min(slopeLength, 0.5 * acceleration * t * t)
        const v = s >= slopeLength ? Math.sqrt(2 * acceleration * slopeLength) : acceleration * t
        const h = Math.max(0, values.h - s * Math.sin(angleRad))
        return {
          t,
          v: 0.5 * values.m * v * v + values.m * g * h,
        }
      }),
    [acceleration, angleRad, slopeLength, values.duration, values.h, values.m],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const topX = width * 0.24
                const topY = height * 0.18
                const baseX = width * 0.78
                const baseY = height * 0.76
                const x = topX + (baseX - topX) * (travel / slopeLength || 0)
                const y = topY + (baseY - topY) * (travel / slopeLength || 0)

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.18)'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.moveTo(topX, topY)
                ctx.lineTo(baseX, baseY)
                ctx.lineTo(width * 0.84, baseY)
                ctx.stroke()

                ctx.fillStyle = '#d9c3a1'
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(angleRad)
                ctx.fillRect(-20, -16, 40, 28)
                ctx.restore()

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`v = ${velocity.toFixed(2)} m/s`, width - 140, 28)
                ctx.fillText(`h = ${currentHeight.toFixed(2)} m`, width - 140, 48)
                ctx.fillText(values.mu === 0 ? '机械能守恒' : '摩擦做负功，机械能下降', 28, 28)
              }}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <div className="metric-tile">
                <div className="panel-caption">当前速度</div>
                <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                  {velocity.toFixed(2)} m/s
                </div>
              </div>
              <div className="metric-tile">
                <div className="panel-caption">机械能</div>
                <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                  {mechanical.toFixed(2)} J
                </div>
              </div>
              <div className="metric-tile">
                <div className="panel-caption">摩擦损失</div>
                <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                  {frictionLoss.toFixed(2)} J
                </div>
              </div>
            </div>

            <EnergyBar
              kinetic={kinetic}
              potential={potential}
              total={mechanical}
              maxEnergy={totalInitial}
            />
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={paramDefs}
            values={values}
            onChange={(key, value) => setValues(current => ({ ...current, [key]: value }))}
            running={running}
            onToggle={() => setRunning(current => !current)}
            onReset={() => reset(true)}
          >
            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              把 <span className="mono-data">μ</span> 调成 0 时，下方曲线应几乎保持水平；
              一旦加入摩擦，势能与动能之和就不再守恒，但总功与动能变化仍然一致。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="机械能"
        unit="J"
        color="#3f6f55"
        xLabel="t (s)"
      />
    </div>
  )
}
