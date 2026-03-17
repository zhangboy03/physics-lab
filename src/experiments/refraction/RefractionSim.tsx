import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'n1', label: '上层介质 n₁', min: 1, max: 2, step: 0.02, defaultValue: 1.5, unit: '' },
  { key: 'n2', label: '下层介质 n₂', min: 1, max: 2, step: 0.02, defaultValue: 1.2, unit: '' },
  { key: 'theta', label: '入射角 θ₁', min: 0, max: 80, step: 1, defaultValue: 38, unit: '°' },
  { key: 'duration', label: '光脉冲周期', min: 2, max: 8, step: 0.5, defaultValue: 4, unit: 's' },
]

const formulas = [
  String.raw`n_1\sin\theta_1 = n_2\sin\theta_2`,
  String.raw`\sin\theta_c = \frac{n_2}{n_1} \quad (n_1 > n_2)`,
  String.raw`n = \frac{c}{v}`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function RefractionSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
    loop: true,
  })

  const theta1 = (values.theta * Math.PI) / 180
  const ratio = (values.n1 * Math.sin(theta1)) / values.n2
  const totalInternal = Math.abs(ratio) > 1
  const theta2 = totalInternal ? null : Math.asin(ratio)
  const critical = values.n1 > values.n2 ? Math.asin(values.n2 / values.n1) : null
  const sinInvariant = values.n1 * Math.sin(theta1)

  const samples = useMemo(
    () =>
      Array.from({ length: 81 }, (_, index) => {
        const theta = (index * Math.PI) / 180
        const r = (values.n1 * Math.sin(theta)) / values.n2
        return {
          t: index,
          v: Math.abs(r) > 1 ? 90 : (Math.asin(r) * 180) / Math.PI,
        }
      }),
    [values.n1, values.n2],
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
                const centerY = height * 0.5
                const pulse = (time / values.duration) % 1

                ctx.fillStyle = 'rgba(49, 92, 168, 0.08)'
                ctx.fillRect(0, 0, width, centerY)
                ctx.fillStyle = 'rgba(196, 90, 40, 0.08)'
                ctx.fillRect(0, centerY, width, centerY)

                ctx.strokeStyle = 'rgba(64, 52, 36, 0.18)'
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(0, centerY)
                ctx.lineTo(width, centerY)
                ctx.moveTo(centerX, 24)
                ctx.lineTo(centerX, height - 24)
                ctx.stroke()

                ctx.setLineDash([6, 6])
                ctx.strokeStyle = 'rgba(64, 52, 36, 0.14)'
                ctx.beginPath()
                ctx.moveTo(centerX, 24)
                ctx.lineTo(centerX, height - 24)
                ctx.stroke()
                ctx.setLineDash([])

                const rayLength = Math.min(width, height) * 0.34
                const incidentX = centerX - Math.sin(theta1) * rayLength
                const incidentY = centerY - Math.cos(theta1) * rayLength

                ctx.strokeStyle = '#315ca8'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.moveTo(incidentX, incidentY)
                ctx.lineTo(centerX, centerY)
                ctx.stroke()

                const pulseIncidentX = incidentX + (centerX - incidentX) * pulse
                const pulseIncidentY = incidentY + (centerY - incidentY) * pulse
                ctx.fillStyle = '#315ca8'
                ctx.beginPath()
                ctx.arc(pulseIncidentX, pulseIncidentY, 7, 0, Math.PI * 2)
                ctx.fill()

                if (totalInternal) {
                  const reflectX = centerX + Math.sin(theta1) * rayLength
                  const reflectY = centerY - Math.cos(theta1) * rayLength
                  ctx.strokeStyle = '#c45a28'
                  ctx.beginPath()
                  ctx.moveTo(centerX, centerY)
                  ctx.lineTo(reflectX, reflectY)
                  ctx.stroke()

                  const reflectPulseX = centerX + (reflectX - centerX) * pulse
                  const reflectPulseY = centerY + (reflectY - centerY) * pulse
                  ctx.fillStyle = '#c45a28'
                  ctx.beginPath()
                  ctx.arc(reflectPulseX, reflectPulseY, 7, 0, Math.PI * 2)
                  ctx.fill()
                } else if (theta2 !== null) {
                  const refractX = centerX + Math.sin(theta2) * rayLength
                  const refractY = centerY + Math.cos(theta2) * rayLength
                  ctx.strokeStyle = '#c45a28'
                  ctx.beginPath()
                  ctx.moveTo(centerX, centerY)
                  ctx.lineTo(refractX, refractY)
                  ctx.stroke()

                  const refractPulseX = centerX + (refractX - centerX) * pulse
                  const refractPulseY = centerY + (refractY - centerY) * pulse
                  ctx.fillStyle = '#c45a28'
                  ctx.beginPath()
                  ctx.arc(refractPulseX, refractPulseY, 7, 0, Math.PI * 2)
                  ctx.fill()
                }

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`n₁ = ${values.n1.toFixed(2)}`, 24, 28)
                ctx.fillText(`n₂ = ${values.n2.toFixed(2)}`, 24, 48)
                ctx.fillText(totalInternal ? '已进入全反射条件' : '满足折射定律', 24, 68)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">折射角 θ₂</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {theta2 === null ? '全反射' : `${((theta2 * 180) / Math.PI).toFixed(1)}°`}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">临界角</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {critical === null ? '无' : `${((critical * 180) / Math.PI).toFixed(1)}°`}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">n₁sinθ₁</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {sinInvariant.toFixed(2)}
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
              从光密介质射向光疏介质时，增大入射角就可能超过临界角。超过之后，不再有折射光，只剩反射光。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="折射角 θ₂"
        unit="°"
        color="#315ca8"
        xLabel="θ₁ (°)"
        xFormatter={value => value.toFixed(0)}
      />
    </div>
  )
}
