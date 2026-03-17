import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'nu', label: '入射频率 ν', min: 2, max: 12, step: 0.1, defaultValue: 7, unit: 'arb.' },
  { key: 'phi', label: '逸出功 W₀', min: 2, max: 8, step: 0.1, defaultValue: 4.2, unit: 'eV' },
  { key: 'intensity', label: '光强', min: 0.5, max: 5, step: 0.1, defaultValue: 2.5, unit: 'arb.' },
  { key: 'U', label: '遏止电压 U', min: 0, max: 6, step: 0.1, defaultValue: 1.2, unit: 'V' },
]

const formulas = [
  String.raw`E_k^{\max} = h\nu - W_0`,
  String.raw`\nu_0 = \frac{W_0}{h}`,
  String.raw`eU_s = h\nu - W_0`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

export default function PhotoelectricSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: 4,
    loop: true,
  })

  const threshold = values.phi
  const kineticMax = Math.max(0, values.nu - values.phi)
  const transmittedEnergy = Math.max(0, kineticMax - values.U)
  const currentLevel = kineticMax === 0 ? 0 : Math.max(0, values.intensity * (1 - values.U / (kineticMax + 0.0001)))

  const samples = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => {
        const nu = (12 * index) / 159
        return {
          t: nu,
          v: Math.max(0, nu - values.phi),
        }
      }),
    [values.phi],
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[360px] p-0">
            <SimCanvas
              draw={(ctx, width, height) => {
                ctx.clearRect(0, 0, width, height)

                const cathodeX = width * 0.18
                const anodeX = width * 0.8
                const midY = height * 0.56
                const wavePhase = time * values.nu

                ctx.fillStyle = 'rgba(64, 52, 36, 0.08)'
                ctx.fillRect(cathodeX - 24, height * 0.26, 36, height * 0.52)
                ctx.fillRect(anodeX - 12, height * 0.26, 36, height * 0.52)

                ctx.strokeStyle = '#315ca8'
                ctx.lineWidth = 2.5
                ctx.beginPath()
                for (let x = 0; x <= 160; x += 4) {
                  const sx = width * 0.02 + x
                  const sy = height * 0.22 + Math.sin(x / 18 - wavePhase * 2.6) * 12
                  if (x === 0) {
                    ctx.moveTo(sx, sy)
                  } else {
                    ctx.lineTo(sx, sy)
                  }
                }
                ctx.stroke()

                const particles = Math.max(0, Math.round(currentLevel * 2.4))
                for (let index = 0; index < particles; index += 1) {
                  const localPhase = ((time * (0.5 + transmittedEnergy * 0.15)) + index / Math.max(particles, 1)) % 1
                  const x = cathodeX + 22 + (anodeX - cathodeX - 44) * localPhase
                  const y = midY - 56 + ((index % 6) * 20)
                  ctx.fillStyle = '#c45a28'
                  ctx.beginPath()
                  ctx.arc(x, y, 4.5, 0, Math.PI * 2)
                  ctx.fill()
                }

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`ν₀ = ${threshold.toFixed(2)}`, 24, 28)
                ctx.fillText(`Eₖ,max = ${kineticMax.toFixed(2)} eV`, 24, 48)
                ctx.fillText(
                  kineticMax === 0
                    ? '频率未达截止频率，不会逸出电子'
                    : transmittedEnergy > 0
                      ? '部分电子成功到达阳极'
                      : '遏止电压已拦截电子',
                  24,
                  68,
                )
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">最大初动能</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {kineticMax.toFixed(2)} eV
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">截止频率</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {threshold.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">相对光电流</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {currentLevel.toFixed(2)}
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
              提高光强会增加电子数量，但不会提高单个电子的最大初动能。真正决定能否逸出的是频率是否超过截止频率。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples}
        label="最大初动能"
        unit="eV"
        color="#c45a28"
        xLabel="ν"
        xFormatter={value => value.toFixed(1)}
      />
    </div>
  )
}
