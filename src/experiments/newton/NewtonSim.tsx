import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import { drawArrow } from '../canvasUtils'
import usePlayback from '../usePlayback'

const g = 9.8

const paramDefs: ParamDef[] = [
  { key: 'm', label: '质量 m', min: 0.5, max: 8, step: 0.1, defaultValue: 2, unit: 'kg' },
  { key: 'F', label: '拉力 F', min: 0, max: 50, step: 0.5, defaultValue: 24, unit: 'N' },
  { key: 'mu', label: '摩擦系数 μ', min: 0, max: 0.8, step: 0.02, defaultValue: 0.2, unit: '' },
  { key: 'duration', label: '观察时长', min: 2, max: 12, step: 0.5, defaultValue: 6, unit: 's' },
]

const formulas = [
  String.raw`F_{\text{net}} = F - f`,
  String.raw`f = \mu N = \mu mg`,
  String.raw`a = \frac{F_{\text{net}}}{m}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function NewtonSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
  })

  const friction = values.mu * values.m * g
  const netForce = Math.max(0, values.F - friction)
  const acceleration = netForce / values.m
  const displacement = 0.5 * acceleration * time * time

  const samples = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => {
        const t = (values.duration * index) / 119
        return {
          t,
          v: acceleration * t,
        }
      }),
    [acceleration, values.duration],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const groundY = height * 0.72
                const padding = 52
                const maxTrack = Math.max(6, 0.5 * acceleration * values.duration * values.duration + 2)
                const blockX = padding + ((width - padding * 2) * Math.min(displacement, maxTrack)) / maxTrack

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.18)'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.moveTo(padding, groundY)
                ctx.lineTo(width - padding, groundY)
                ctx.stroke()

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.1)'
                ctx.lineWidth = 1
                for (let index = 0; index <= 6; index += 1) {
                  const x = padding + ((width - padding * 2) * index) / 6
                  ctx.beginPath()
                  ctx.moveTo(x, groundY - 8)
                  ctx.lineTo(x, groundY + 8)
                  ctx.stroke()
                }

                ctx.fillStyle = '#d8c4a6'
                ctx.fillRect(blockX - 34, groundY - 56, 68, 46)
                ctx.strokeStyle = 'rgba(64, 52, 36, 0.25)'
                ctx.strokeRect(blockX - 34, groundY - 56, 68, 46)

                drawArrow(ctx, blockX, groundY - 72, blockX + 74, groundY - 72, '#c45a28')
                drawArrow(ctx, blockX, groundY - 18, blockX - 58, groundY - 18, '#315ca8')

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`F = ${values.F.toFixed(1)} N`, blockX + 20, groundY - 82)
                ctx.fillText(`f = ${friction.toFixed(1)} N`, blockX - 96, groundY - 24)
                ctx.fillText(`a = ${acceleration.toFixed(2)} m/s²`, padding, 30)
                ctx.fillText(
                  netForce === 0 ? '静摩擦可平衡拉力，木块保持静止' : '合外力不为零，木块做匀加速运动',
                  padding,
                  52,
                )
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">合力</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {netForce.toFixed(2)} N
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">加速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {acceleration.toFixed(2)} m/s²
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">位移</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {displacement.toFixed(2)} m
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
            onReset={() => reset(true)}
          >
            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              关键不是只看 <span className="mono-data">F</span>，而是先判断它能不能突破最大摩擦。
              当 <span className="mono-data">F ≤ μmg</span> 时，系统不会起动。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="速度 v"
        unit="m/s"
        color="#c45a28"
        xLabel="t (s)"
      />
    </div>
  )
}
