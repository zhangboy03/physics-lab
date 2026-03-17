import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import { drawArrow } from '../canvasUtils'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'M', label: '中心天体强度', min: 1, max: 8, step: 0.2, defaultValue: 3, unit: 'arb.' },
  { key: 'r', label: '轨道半径 r', min: 3, max: 10, step: 0.2, defaultValue: 5.5, unit: 'arb.' },
  { key: 'm', label: '卫星质量 m', min: 0.5, max: 4, step: 0.1, defaultValue: 1.2, unit: 'kg' },
  { key: 'duration', label: '观察窗口', min: 4, max: 20, step: 0.5, defaultValue: 12, unit: 's' },
]

const formulas = [
  String.raw`F = G\frac{Mm}{r^2}`,
  String.raw`v = \sqrt{\frac{GM}{r}}`,
  String.raw`T = 2\pi\sqrt{\frac{r^3}{GM}}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function GravitySim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
    loop: true,
  })

  const mu = values.M * 30
  const orbitalSpeed = Math.sqrt(mu / values.r)
  const orbitalPeriod = (Math.PI * 2 * values.r) / orbitalSpeed
  const orbitalAcceleration = mu / (values.r * values.r)
  const angle = (Math.PI * 2 * time) / orbitalPeriod
  const gravitationalForce = values.m * orbitalAcceleration

  const samples = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => {
        const t = (values.duration * index) / 159
        const sampleAngle = (Math.PI * 2 * t) / orbitalPeriod
        return {
          t,
          v: values.r * Math.sin(sampleAngle),
        }
      }),
    [orbitalPeriod, values.duration, values.r],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const centerX = width * 0.5
                const centerY = height * 0.52
                const orbitPx = Math.min(width, height) * 0.3
                const x = centerX + orbitPx * Math.cos(angle)
                const y = centerY - orbitPx * Math.sin(angle)

                ctx.strokeStyle = 'rgba(49, 92, 168, 0.18)'
                ctx.lineWidth = 2.5
                ctx.beginPath()
                ctx.arc(centerX, centerY, orbitPx, 0, Math.PI * 2)
                ctx.stroke()

                const planetGradient = ctx.createRadialGradient(
                  centerX - 18,
                  centerY - 22,
                  10,
                  centerX,
                  centerY,
                  64,
                )
                planetGradient.addColorStop(0, '#f2b66f')
                planetGradient.addColorStop(1, '#8e3928')
                ctx.fillStyle = planetGradient
                ctx.beginPath()
                ctx.arc(centerX, centerY, 46, 0, Math.PI * 2)
                ctx.fill()

                ctx.strokeStyle = 'rgba(255,255,255,0.24)'
                ctx.beginPath()
                ctx.arc(centerX, centerY, 34, -0.7, 0.8)
                ctx.stroke()

                drawArrow(ctx, x, y, centerX, centerY, '#315ca8')
                drawArrow(
                  ctx,
                  x,
                  y,
                  x - Math.sin(angle) * 52,
                  y - Math.cos(angle) * 52,
                  '#3f6f55',
                )

                ctx.fillStyle = '#2c5daa'
                ctx.shadowColor = 'rgba(49, 92, 168, 0.38)'
                ctx.shadowBlur = 16
                ctx.beginPath()
                ctx.arc(x, y, 12, 0, Math.PI * 2)
                ctx.fill()
                ctx.shadowBlur = 0

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`v = ${orbitalSpeed.toFixed(2)}`, width - 126, 28)
                ctx.fillText(`T = ${orbitalPeriod.toFixed(2)} s`, width - 126, 48)
                ctx.fillText('引力提供向心力', 28, 28)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">轨道速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {orbitalSpeed.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">轨道周期</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {orbitalPeriod.toFixed(2)} s
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">引力大小</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {gravitationalForce.toFixed(2)} N
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
              当轨道半径增大时，速度会下降而周期变长。卫星质量只影响引力和动量，不影响同一圆轨道的速度。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="轨道纵坐标 y"
        unit="arb."
        color="#315ca8"
        xLabel="t (s)"
      />
    </div>
  )
}
