import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import { drawArrow } from '../canvasUtils'
import usePlayback from '../usePlayback'

type ChargeSign = 'positive' | 'negative'

const paramDefs: ParamDef[] = [
  { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, defaultValue: 1.4, unit: 'kg' },
  { key: 'q', label: '电荷量 |q|', min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: 'C' },
  { key: 'v', label: '初速度 v', min: 1, max: 8, step: 0.2, defaultValue: 4, unit: 'm/s' },
  { key: 'B', label: '磁感应强度 B', min: 0.5, max: 5, step: 0.1, defaultValue: 1.8, unit: 'T' },
]

const formulas = [
  String.raw`F = qvB`,
  String.raw`r = \frac{mv}{|q|B}`,
  String.raw`T = \frac{2\pi m}{|q|B}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function LorentzSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const [sign, setSign] = useState<ChargeSign>('positive')

  const period = (Math.PI * 2 * values.m) / (values.q * values.B)
  const { time, running, setRunning, reset } = usePlayback({
    duration: period,
    loop: true,
  })

  const direction = sign === 'positive' ? 1 : -1
  const omega = (values.q * values.B) / values.m
  const radius = (values.m * values.v) / (values.q * values.B)
  const angle = omega * time
  const force = values.q * values.v * values.B

  const samples = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => {
        const t = (period * index) / 159
        return {
          t,
          v: direction * radius * (1 - Math.cos(omega * t)),
        }
      }),
    [direction, omega, period, radius],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const centerX = width * 0.28
                const centerY = height * 0.5
                const radiusPx = Math.min(width, height) * 0.26
                const x = centerX + radiusPx * Math.sin(angle)
                const y = centerY + direction * radiusPx * (1 - Math.cos(angle))

                ctx.fillStyle = 'rgba(49, 92, 168, 0.08)'
                for (let gx = 0; gx < width; gx += 48) {
                  for (let gy = 0; gy < height; gy += 48) {
                    ctx.beginPath()
                    ctx.arc(gx + 16, gy + 16, 5, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = '#315ca8'
                    ctx.beginPath()
                    ctx.arc(gx + 16, gy + 16, 1.8, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = 'rgba(49, 92, 168, 0.08)'
                  }
                }

                ctx.strokeStyle = 'rgba(196, 90, 40, 0.22)'
                ctx.lineWidth = 3
                ctx.beginPath()
                for (let index = 0; index <= 120; index += 1) {
                  const sample = (angle * index) / 120
                  const sx = centerX + radiusPx * Math.sin(sample)
                  const sy = centerY + direction * radiusPx * (1 - Math.cos(sample))
                  if (index === 0) {
                    ctx.moveTo(sx, sy)
                  } else {
                    ctx.lineTo(sx, sy)
                  }
                }
                ctx.stroke()

                drawArrow(ctx, x, y, x + 52 * Math.cos(angle), y + direction * 52 * Math.sin(angle), '#c45a28')
                drawArrow(
                  ctx,
                  x,
                  y,
                  centerX,
                  centerY + direction * radiusPx,
                  '#315ca8',
                )

                ctx.fillStyle = sign === 'positive' ? '#c45a28' : '#315ca8'
                ctx.beginPath()
                ctx.arc(x, y, 12, 0, Math.PI * 2)
                ctx.fill()

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText('纸面外磁场', width - 124, 28)
                ctx.fillText(sign === 'positive' ? '正电荷向下偏转' : '负电荷向上偏转', 28, 28)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">轨道半径</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {radius.toFixed(2)} m
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">周期</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {period.toFixed(2)} s
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">洛伦兹力</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {force.toFixed(2)} N
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
            <div>
              <div className="text-[13px] font-medium text-[var(--color-ink)]">带电粒子</div>
              <div className="segmented mt-3">
                <button
                  type="button"
                  className={sign === 'positive' ? 'is-active' : ''}
                  onClick={() => setSign('positive')}
                >
                  正电荷
                </button>
                <button
                  type="button"
                  className={sign === 'negative' ? 'is-active' : ''}
                  onClick={() => setSign('negative')}
                >
                  负电荷
                </button>
              </div>
            </div>

            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              当 <span className="mono-data">v</span> 增大或 <span className="mono-data">B</span> 变弱时，轨道半径会变大；
              电荷正负只改变偏转方向，不改变半径公式中的绝对值关系。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="纵向位移 y"
        unit="m"
        color={sign === 'positive' ? '#c45a28' : '#315ca8'}
        xLabel="t (s)"
      />
    </div>
  )
}
