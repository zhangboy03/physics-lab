import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

type CircuitMode = 'series' | 'parallel'

const paramDefs: ParamDef[] = [
  { key: 'U', label: '电源电压 U', min: 1, max: 24, step: 0.5, defaultValue: 12, unit: 'V' },
  { key: 'R1', label: '电阻 R₁', min: 1, max: 20, step: 0.5, defaultValue: 6, unit: 'Ω' },
  { key: 'R2', label: '电阻 R₂', min: 1, max: 20, step: 0.5, defaultValue: 9, unit: 'Ω' },
  { key: 'duration', label: '电荷循环周期', min: 2, max: 8, step: 0.5, defaultValue: 4, unit: 's' },
]

const formulas = [
  String.raw`I = \frac{U}{R}`,
  String.raw`R_{\text{串}} = R_1 + R_2`,
  String.raw`\frac{1}{R_{\text{并}}} = \frac{1}{R_1} + \frac{1}{R_2}`,
  String.raw`P = UI = \frac{U^2}{R}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

function equivalentResistance(values: Record<string, number>, mode: CircuitMode) {
  return mode === 'series'
    ? values.R1 + values.R2
    : (values.R1 * values.R2) / (values.R1 + values.R2)
}

export default function OhmSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const [mode, setMode] = useState<CircuitMode>('series')
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
    loop: true,
  })

  const req = equivalentResistance(values, mode)
  const current = values.U / req
  const power = values.U * current
  const branchCurrent1 = values.U / values.R1
  const branchCurrent2 = values.U / values.R2

  const samples = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => {
        const u = (24 * index) / 119
        return {
          t: u,
          v: u / req,
        }
      }),
    [req],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const phase = time / values.duration
                const left = width * 0.18
                const right = width * 0.82
                const top = height * 0.28
                const bottom = height * 0.72

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.2)'
                ctx.lineWidth = 4

                if (mode === 'series') {
                  ctx.beginPath()
                  ctx.moveTo(left, top)
                  ctx.lineTo(width * 0.34, top)
                  ctx.lineTo(width * 0.46, top)
                  ctx.lineTo(width * 0.58, top)
                  ctx.lineTo(width * 0.7, top)
                  ctx.lineTo(right, top)
                  ctx.lineTo(right, bottom)
                  ctx.lineTo(left, bottom)
                  ctx.lineTo(left, top)
                  ctx.stroke()

                  ctx.fillStyle = '#d8c4a6'
                  ctx.fillRect(width * 0.34, top - 14, 72, 28)
                  ctx.fillRect(width * 0.58, top - 14, 72, 28)
                  ctx.strokeStyle = 'rgba(64, 52, 36, 0.25)'
                  ctx.strokeRect(width * 0.34, top - 14, 72, 28)
                  ctx.strokeRect(width * 0.58, top - 14, 72, 28)

                  const pathLength = (right - left) * 2 + (bottom - top) * 2
                  for (let dot = 0; dot < 8; dot += 1) {
                    const d = ((phase + dot / 8) % 1) * pathLength
                    let x = left
                    let y = top

                    if (d <= right - left) {
                      x = left + d
                    } else if (d <= right - left + bottom - top) {
                      x = right
                      y = top + (d - (right - left))
                    } else if (d <= 2 * (right - left) + bottom - top) {
                      x = right - (d - (right - left + bottom - top))
                      y = bottom
                    } else {
                      x = left
                      y = bottom - (d - (2 * (right - left) + bottom - top))
                    }

                    ctx.fillStyle = '#315ca8'
                    ctx.beginPath()
                    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
                    ctx.fill()
                  }
                } else {
                  const midX = width * 0.52
                  const upperY = height * 0.38
                  const lowerY = height * 0.62

                  ctx.beginPath()
                  ctx.moveTo(left, height * 0.5)
                  ctx.lineTo(width * 0.28, height * 0.5)
                  ctx.lineTo(width * 0.28, upperY)
                  ctx.lineTo(midX, upperY)
                  ctx.lineTo(right, upperY)
                  ctx.lineTo(right, lowerY)
                  ctx.lineTo(midX, lowerY)
                  ctx.lineTo(width * 0.28, lowerY)
                  ctx.lineTo(width * 0.28, height * 0.5)
                  ctx.lineTo(left, height * 0.5)
                  ctx.stroke()

                  ctx.fillStyle = '#d8c4a6'
                  ctx.fillRect(width * 0.42, upperY - 14, 72, 28)
                  ctx.fillRect(width * 0.42, lowerY - 14, 72, 28)
                  ctx.strokeStyle = 'rgba(64, 52, 36, 0.25)'
                  ctx.strokeRect(width * 0.42, upperY - 14, 72, 28)
                  ctx.strokeRect(width * 0.42, lowerY - 14, 72, 28)

                  for (let dot = 0; dot < 6; dot += 1) {
                    const offset = (phase + dot / 6) % 1
                    ctx.fillStyle = '#315ca8'
                    ctx.beginPath()
                    ctx.arc(width * 0.28 + (right - width * 0.28) * offset, upperY, 4.2, 0, Math.PI * 2)
                    ctx.fill()

                    ctx.fillStyle = '#c45a28'
                    ctx.beginPath()
                    ctx.arc(width * 0.28 + (right - width * 0.28) * offset, lowerY, 4.2, 0, Math.PI * 2)
                    ctx.fill()
                  }
                }

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.22)'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.moveTo(left - 14, height * 0.44)
                ctx.lineTo(left - 14, height * 0.56)
                ctx.moveTo(left - 2, height * 0.4)
                ctx.lineTo(left - 2, height * 0.6)
                ctx.stroke()

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`U = ${values.U.toFixed(1)} V`, 28, 28)
                ctx.fillText(mode === 'series' ? '串联: 电流处处相等' : '并联: 各支路电压相等', 28, 48)
                ctx.fillText(`R₁ = ${values.R1.toFixed(1)} Ω`, width * 0.34, top - 24)
                ctx.fillText(`R₂ = ${values.R2.toFixed(1)} Ω`, mode === 'series' ? width * 0.58 : width * 0.42, mode === 'series' ? top - 24 : bottom - 8)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">等效电阻</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {req.toFixed(2)} Ω
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">总电流</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {current.toFixed(2)} A
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">总功率</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {power.toFixed(2)} W
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
              <div className="text-[13px] font-medium text-[var(--color-ink)]">连接方式</div>
              <div className="segmented mt-3">
                <button
                  type="button"
                  className={mode === 'series' ? 'is-active' : ''}
                  onClick={() => setMode('series')}
                >
                  串联
                </button>
                <button
                  type="button"
                  className={mode === 'parallel' ? 'is-active' : ''}
                  onClick={() => setMode('parallel')}
                >
                  并联
                </button>
              </div>
            </div>

            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              {mode === 'series'
                ? '串联时等效电阻变大，总电流变小，而且每个电阻中流过的电流完全相同。'
                : `并联时总电流分流，当前 I₁=${branchCurrent1.toFixed(2)} A，I₂=${branchCurrent2.toFixed(2)} A。`}
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="伏安关系 I(U)"
        unit="A"
        color="#c45a28"
        xLabel="U (V)"
        xFormatter={value => value.toFixed(0)}
      />
    </div>
  )
}
