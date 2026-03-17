import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import { drawArrow } from '../canvasUtils'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'r', label: '半径 r', min: 0.8, max: 4, step: 0.1, defaultValue: 2, unit: 'm' },
  { key: 'period', label: '周期 T', min: 1, max: 8, step: 0.2, defaultValue: 4, unit: 's' },
  { key: 'mass', label: '质量 m', min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: 'kg' },
  { key: 'duration', label: '观察窗口', min: 4, max: 16, step: 0.5, defaultValue: 8, unit: 's' },
]

const formulas = [
  String.raw`v = \omega r`,
  String.raw`a_c = \frac{v^2}{r} = \omega^2 r`,
  String.raw`T = \frac{2\pi}{\omega}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function CircularSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
    loop: true,
  })

  const omega = (Math.PI * 2) / values.period
  const speed = omega * values.r
  const centripetal = omega * omega * values.r
  const angle = omega * time
  const kinetic = 0.5 * values.mass * speed * speed

  const samples = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => {
        const t = (values.duration * index) / 159
        return {
          t,
          v: values.r * Math.sin(omega * t),
        }
      }),
    [omega, values.duration, values.r],
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
                const radiusPx = Math.min(width, height) * 0.28
                const x = centerX + radiusPx * Math.cos(angle)
                const y = centerY - radiusPx * Math.sin(angle)

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.12)'
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo(centerX - radiusPx - 36, centerY)
                ctx.lineTo(centerX + radiusPx + 36, centerY)
                ctx.moveTo(centerX, centerY - radiusPx - 36)
                ctx.lineTo(centerX, centerY + radiusPx + 36)
                ctx.stroke()

                ctx.strokeStyle = 'rgba(49, 92, 168, 0.24)'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2)
                ctx.stroke()

                ctx.strokeStyle = 'rgba(196, 90, 40, 0.18)'
                ctx.lineWidth = 2
                ctx.beginPath()
                for (let index = 0; index <= 120; index += 1) {
                  const sampleAngle = (angle * index) / 120
                  const sampleX = centerX + radiusPx * Math.cos(sampleAngle)
                  const sampleY = centerY - radiusPx * Math.sin(sampleAngle)
                  if (index === 0) {
                    ctx.moveTo(sampleX, sampleY)
                  } else {
                    ctx.lineTo(sampleX, sampleY)
                  }
                }
                ctx.stroke()

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.28)'
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.lineTo(x, y)
                ctx.stroke()

                drawArrow(
                  ctx,
                  x,
                  y,
                  x - Math.sin(angle) * 54,
                  y - Math.cos(angle) * 54,
                  '#c45a28',
                )
                drawArrow(
                  ctx,
                  x,
                  y,
                  x - Math.cos(angle) * 48,
                  y + Math.sin(angle) * 48,
                  '#315ca8',
                )

                ctx.fillStyle = '#1f1c18'
                ctx.beginPath()
                ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
                ctx.fill()

                ctx.fillStyle = '#315ca8'
                ctx.shadowColor = 'rgba(49, 92, 168, 0.3)'
                ctx.shadowBlur = 18
                ctx.beginPath()
                ctx.arc(x, y, 14, 0, Math.PI * 2)
                ctx.fill()
                ctx.shadowBlur = 0

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText('向心加速度', x - Math.cos(angle) * 48 - 8, y + Math.sin(angle) * 48 - 10)
                ctx.fillText('速度方向', x - Math.sin(angle) * 54 - 8, y - Math.cos(angle) * 54 - 10)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">线速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {speed.toFixed(2)} m/s
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">向心加速度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {centripetal.toFixed(2)} m/s²
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">动能</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {kinetic.toFixed(2)} J
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
              固定半径时，缩短周期会同时提高 <span className="mono-data">v</span> 和
              <span className="mono-data"> a_c</span>。质量不改变轨迹形状，但会改变维持圆周运动所需的向心力与动能。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="纵向坐标 y"
        unit="m"
        color="#315ca8"
        xLabel="t (s)"
      />
    </div>
  )
}
