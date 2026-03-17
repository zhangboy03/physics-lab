import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import { drawArrow } from '../canvasUtils'
import usePlayback from '../usePlayback'

const k = 9

const paramDefs: ParamDef[] = [
  { key: 'q1', label: '左侧电荷 q₁', min: -6, max: 6, step: 0.5, defaultValue: 4, unit: 'μC' },
  { key: 'q2', label: '右侧电荷 q₂', min: -6, max: 6, step: 0.5, defaultValue: -3, unit: 'μC' },
  { key: 'probeX', label: '探针 x', min: -4.5, max: 4.5, step: 0.1, defaultValue: 0, unit: 'm' },
  { key: 'probeY', label: '探针 y', min: -3.2, max: 3.2, step: 0.1, defaultValue: 1.4, unit: 'm' },
  { key: 'duration', label: '场线脉冲周期', min: 2, max: 10, step: 0.5, defaultValue: 5, unit: 's' },
]

const formulas = [
  String.raw`\vec E = k\frac{q}{r^2}\hat r`,
  String.raw`V = k\frac{q}{r}`,
  String.raw`\vec F = q_0 \vec E`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

function fieldFromCharge(
  q: number,
  chargeX: number,
  chargeY: number,
  pointX: number,
  pointY: number,
) {
  const dx = pointX - chargeX
  const dy = pointY - chargeY
  const distanceSq = Math.max(dx * dx + dy * dy, 0.18)
  const distance = Math.sqrt(distanceSq)
  const scale = (k * q) / (distanceSq * distance)
  return {
    ex: scale * dx,
    ey: scale * dy,
    potential: (k * q) / distance,
  }
}

export default function CoulombSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
    loop: true,
  })

  const left = fieldFromCharge(values.q1, -2.2, 0, values.probeX, values.probeY)
  const right = fieldFromCharge(values.q2, 2.2, 0, values.probeX, values.probeY)
  const ex = left.ex + right.ex
  const ey = left.ey + right.ey
  const magnitude = Math.hypot(ex, ey)
  const potential = left.potential + right.potential
  const direction = (Math.atan2(ey, ex) * 180) / Math.PI

  const samples = useMemo(
    () =>
      Array.from({ length: 140 }, (_, index) => {
        const x = -5 + (10 * index) / 139
        const fieldLeft = fieldFromCharge(values.q1, -2.2, 0, x, values.probeY)
        const fieldRight = fieldFromCharge(values.q2, 2.2, 0, x, values.probeY)
        return {
          t: x,
          v: fieldLeft.potential + fieldRight.potential,
        }
      }),
    [values.probeY, values.q1, values.q2],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const scale = Math.min(width / 12, height / 8)
                const toX = (x: number) => width * 0.5 + x * scale
                const toY = (y: number) => height * 0.5 - y * scale
                const pulse = 0.65 + 0.35 * Math.sin((Math.PI * 2 * time) / values.duration)

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.1)'
                ctx.lineWidth = 1
                for (let gx = -5; gx <= 5; gx += 1) {
                  ctx.beginPath()
                  ctx.moveTo(toX(gx), toY(-3.5))
                  ctx.lineTo(toX(gx), toY(3.5))
                  ctx.stroke()
                }
                for (let gy = -3; gy <= 3; gy += 1) {
                  ctx.beginPath()
                  ctx.moveTo(toX(-5.5), toY(gy))
                  ctx.lineTo(toX(5.5), toY(gy))
                  ctx.stroke()
                }

                for (let gx = -5; gx <= 5; gx += 1) {
                  for (let gy = -3; gy <= 3; gy += 1) {
                    const fromLeft = fieldFromCharge(values.q1, -2.2, 0, gx, gy)
                    const fromRight = fieldFromCharge(values.q2, 2.2, 0, gx, gy)
                    const gridEx = fromLeft.ex + fromRight.ex
                    const gridEy = fromLeft.ey + fromRight.ey
                    const length = Math.min(18, Math.hypot(gridEx, gridEy) * 2.2)
                    const base = Math.atan2(gridEy, gridEx)
                    drawArrow(
                      ctx,
                      toX(gx),
                      toY(gy),
                      toX(gx) + Math.cos(base) * length * pulse,
                      toY(gy) - Math.sin(base) * length * pulse,
                      'rgba(49, 92, 168, 0.38)',
                      1.6,
                    )
                  }
                }

                ;[
                  { x: -2.2, q: values.q1, color: values.q1 >= 0 ? '#c45a28' : '#315ca8' },
                  { x: 2.2, q: values.q2, color: values.q2 >= 0 ? '#c45a28' : '#315ca8' },
                ].forEach(charge => {
                  ctx.fillStyle = charge.color
                  ctx.beginPath()
                  ctx.arc(toX(charge.x), toY(0), 22, 0, Math.PI * 2)
                  ctx.fill()
                  ctx.fillStyle = '#fffaf1'
                  ctx.font = '600 15px "Avenir Next", "PingFang SC", sans-serif'
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillText(charge.q >= 0 ? '+' : '−', toX(charge.x), toY(0))
                })

                ctx.textAlign = 'left'
                ctx.textBaseline = 'alphabetic'
                ctx.strokeStyle = 'rgba(63, 111, 85, 0.28)'
                ctx.setLineDash([5, 6])
                ctx.beginPath()
                ctx.moveTo(toX(values.probeX), toY(values.probeY))
                ctx.lineTo(toX(values.probeX + ex / 3), toY(values.probeY + ey / 3))
                ctx.stroke()
                ctx.setLineDash([])

                ctx.fillStyle = '#3f6f55'
                ctx.beginPath()
                ctx.arc(toX(values.probeX), toY(values.probeY), 10 + 2 * pulse, 0, Math.PI * 2)
                ctx.fill()

                drawArrow(
                  ctx,
                  toX(values.probeX),
                  toY(values.probeY),
                  toX(values.probeX) + Math.cos(Math.atan2(ey, ex)) * Math.min(74, magnitude * 14),
                  toY(values.probeY) - Math.sin(Math.atan2(ey, ex)) * Math.min(74, magnitude * 14),
                  '#3f6f55',
                )

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText('探针处合场强方向', toX(values.probeX) + 18, toY(values.probeY) - 12)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">|E|</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {magnitude.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">电势 V</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {potential.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">方向角</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {direction.toFixed(1)}°
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
              同号电荷的场线在中间会相互“抵消”，异号电荷则更容易在中间形成强场区。把探针拖到不同象限，观察合场强方向如何变化。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="探针所在高度的电势分布"
        unit=""
        color="#315ca8"
        xLabel="x (m)"
        xFormatter={value => value.toFixed(1)}
      />
    </div>
  )
}
