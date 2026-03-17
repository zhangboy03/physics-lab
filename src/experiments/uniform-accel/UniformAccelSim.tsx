import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'x0', label: '初始位置 x₀', min: 0, max: 20, step: 0.5, defaultValue: 0, unit: 'm' },
  { key: 'v0', label: '初速度 v₀', min: -10, max: 25, step: 0.5, defaultValue: 6, unit: 'm/s' },
  { key: 'a', label: '加速度 a', min: -8, max: 8, step: 0.2, defaultValue: 2, unit: 'm/s²' },
  { key: 'duration', label: '观察时长', min: 2, max: 12, step: 0.5, defaultValue: 6, unit: 's' },
]

const formulas = [
  String.raw`x = x_0 + v_0 t + \frac{1}{2}at^2`,
  String.raw`v = v_0 + at`,
  String.raw`v^2 - v_0^2 = 2a(x-x_0)`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

function sampleMotion(values: Record<string, number>, points = 80) {
  const duration = values.duration
  return Array.from({ length: points }, (_, index) => {
    const t = (duration * index) / (points - 1)
    const x = values.x0 + values.v0 * t + 0.5 * values.a * t * t
    const v = values.v0 + values.a * t
    return { t, x, v }
  })
}

export default function UniformAccelSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
  })

  const samples = useMemo(() => sampleMotion(values), [values])
  const currentX = values.x0 + values.v0 * time + 0.5 * values.a * time * time
  const currentV = values.v0 + values.a * time
  const averageV = time > 0 ? (currentX - values.x0) / time : values.v0
  const maxX = Math.max(...samples.map(sample => sample.x))
  const minX = Math.min(...samples.map(sample => sample.x))

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const padding = 56
                const trackY = height * 0.68
                const range = Math.max(maxX - minX, 1)
                const scale = (width - padding * 2) / range
                const toX = (position: number) => padding + (position - minX) * scale

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.2)'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.moveTo(padding, trackY)
                ctx.lineTo(width - padding, trackY)
                ctx.stroke()

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.12)'
                ctx.lineWidth = 1
                for (let mark = 0; mark <= 6; mark += 1) {
                  const x = padding + ((width - padding * 2) * mark) / 6
                  ctx.beginPath()
                  ctx.moveTo(x, trackY - 10)
                  ctx.lineTo(x, trackY + 10)
                  ctx.stroke()
                }

                const carX = toX(currentX)
                ctx.fillStyle = '#315ca8'
                ctx.fillRect(carX - 28, trackY - 34, 56, 24)
                ctx.fillStyle = '#1f1c18'
                ctx.beginPath()
                ctx.arc(carX - 16, trackY - 6, 8, 0, Math.PI * 2)
                ctx.arc(carX + 16, trackY - 6, 8, 0, Math.PI * 2)
                ctx.fill()

                ctx.strokeStyle = currentV >= 0 ? '#3f6f55' : '#8e3928'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.moveTo(carX, trackY - 56)
                ctx.lineTo(carX + Math.max(-80, Math.min(80, currentV * 8)), trackY - 56)
                ctx.stroke()
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">当前位置</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {currentX.toFixed(2)} m
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">当前速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {currentV.toFixed(2)} m/s
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">平均速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {averageV.toFixed(2)} m/s
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={paramDefs}
            values={values}
            onChange={(key, value) => setValues(current => ({ ...current, [key]: value }))}
            running={running}
            onToggle={() => setRunning(current => !current)}
            onReset={() => {
              reset(true)
            }}
          >
            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              观察 <span className="mono-data">a</span> 改变时，速度图像斜率如何改变；再比较位移变化是否体现出二次函数特征。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples.map(sample => ({ t: sample.t, v: sample.v }))}
        label="速度 v"
        unit="m/s"
        color="#315ca8"
        xLabel="t (s)"
      />
    </div>
  )
}
