import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'B', label: '磁感应强度 B', min: 0.5, max: 4, step: 0.1, defaultValue: 1.6, unit: 'T' },
  { key: 'S', label: '线圈面积 S', min: 0.2, max: 2, step: 0.05, defaultValue: 0.8, unit: 'm²' },
  { key: 'N', label: '匝数 N', min: 10, max: 200, step: 5, defaultValue: 80, unit: '' },
  { key: 'omega', label: '角速度 ω', min: 0.5, max: 6, step: 0.1, defaultValue: 2.4, unit: 'rad/s' },
  { key: 'R', label: '回路电阻 R', min: 1, max: 20, step: 0.5, defaultValue: 8, unit: 'Ω' },
]

const formulas = [
  String.raw`\Phi = NBS\cos\theta`,
  String.raw`e = -N\frac{d\Phi}{dt}`,
  String.raw`e_{\max} = NBS\omega`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function FaradaySim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const period = (Math.PI * 2) / values.omega
  const { time, running, setRunning, reset } = usePlayback({
    duration: period,
    loop: true,
  })

  const theta = values.omega * time
  const flux = values.N * values.B * values.S * Math.cos(theta)
  const emf = values.N * values.B * values.S * values.omega * Math.sin(theta)
  const current = emf / values.R
  const emfPeak = values.N * values.B * values.S * values.omega

  const samples = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => {
        const t = (period * index) / 179
        return {
          t,
          v: values.N * values.B * values.S * values.omega * Math.sin(values.omega * t),
        }
      }),
    [period, values.B, values.N, values.S, values.omega],
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
                const projectedWidth = 40 + 120 * Math.abs(Math.cos(theta))
                const coilHeight = 120

                ctx.fillStyle = 'rgba(49, 92, 168, 0.08)'
                for (let gx = 56; gx <= width - 56; gx += 48) {
                  for (let gy = 56; gy <= height - 56; gy += 48) {
                    ctx.beginPath()
                    ctx.arc(gx, gy, 5.5, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = '#315ca8'
                    ctx.beginPath()
                    ctx.arc(gx, gy, 2, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = 'rgba(49, 92, 168, 0.08)'
                  }
                }

                ctx.fillStyle = 'rgba(196, 90, 40, 0.1)'
                ctx.fillRect(width * 0.16, height * 0.18, 36, height * 0.64)
                ctx.fillRect(width * 0.78, height * 0.18, 36, height * 0.64)

                ctx.strokeStyle = '#c45a28'
                ctx.lineWidth = 3
                ctx.strokeRect(centerX - projectedWidth / 2, centerY - coilHeight / 2, projectedWidth, coilHeight)

                ctx.beginPath()
                ctx.moveTo(centerX, centerY - coilHeight / 2 - 34)
                ctx.lineTo(centerX, centerY + coilHeight / 2 + 34)
                ctx.strokeStyle = 'rgba(64, 52, 36, 0.18)'
                ctx.lineWidth = 2
                ctx.stroke()

                ctx.strokeStyle = '#3f6f55'
                ctx.lineWidth = 2.5
                ctx.beginPath()
                ctx.arc(centerX, centerY - coilHeight / 2 - 40, 18, -Math.PI * 0.7, Math.PI * 0.8)
                ctx.stroke()

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`Φ = ${flux.toFixed(2)}`, 24, 28)
                ctx.fillText(`e = ${emf.toFixed(2)} V`, 24, 48)
                ctx.fillText(`I = ${current.toFixed(2)} A`, 24, 68)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">磁通量</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {flux.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">感应电动势</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {emf.toFixed(2)} V
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">峰值电动势</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {emfPeak.toFixed(2)} V
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
              线圈转得越快，或者 <span className="mono-data">NBS</span> 越大，正弦波振幅就越大。
              注意磁通量为零时，感应电动势反而达到最大。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="感应电动势 e"
        unit="V"
        color="#315ca8"
        xLabel="t (s)"
      />
    </div>
  )
}
