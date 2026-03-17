import { useMemo, useState } from 'react'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import SimCanvas from '../../components/SimCanvas'
import type { ParamDef } from '../types'
import usePlayback from '../usePlayback'

const paramDefs: ParamDef[] = [
  { key: 'T', label: '温度 T', min: 1, max: 10, step: 0.2, defaultValue: 5, unit: 'arb.' },
  { key: 'radius', label: '颗粒半径 r', min: 0.5, max: 3, step: 0.1, defaultValue: 1.2, unit: 'μm' },
  { key: 'eta', label: '黏滞系数 η', min: 0.5, max: 3, step: 0.1, defaultValue: 1.1, unit: 'arb.' },
  { key: 'duration', label: '观察时长', min: 4, max: 20, step: 0.5, defaultValue: 10, unit: 's' },
]

const formulas = [
  String.raw`D \propto \frac{T}{\eta r}`,
  String.raw`\langle x^2 \rangle = 2Dt`,
  String.raw`\langle r^2 \rangle = 4Dt`,
]

function getDefaultValues() {
  return Object.fromEntries(paramDefs.map(param => [param.key, param.defaultValue]))
}

function createGenerator(seed: number) {
  let current = seed % 2147483647
  if (current <= 0) {
    current += 2147483646
  }

  return () => {
    current = (current * 16807) % 2147483647
    return (current - 1) / 2147483646
  }
}

export default function BrownianSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues)
  const { time, running, setRunning, reset } = usePlayback({
    duration: values.duration,
  })

  const diffusion = (values.T / (values.radius * values.eta)) * 0.22

  const samples = useMemo(() => {
    const dt = values.duration / 320
    const sigma = Math.sqrt(4 * diffusion * dt)
    const seed = Math.round(values.T * 97 + values.radius * 131 + values.eta * 173)
    const random = createGenerator(seed)
    const points = [{ t: 0, x: 0, y: 0, r2: 0 }]

    let x = 0
    let y = 0

    for (let index = 1; index <= 320; index += 1) {
      const angle = random() * Math.PI * 2
      const step = sigma * (0.35 + random())
      x += Math.cos(angle) * step
      y += Math.sin(angle) * step
      points.push({
        t: index * dt,
        x,
        y,
        r2: x * x + y * y,
      })
    }

    return points
  }, [diffusion, values.T, values.duration, values.eta, values.radius])

  const currentIndex = Math.min(samples.length - 1, Math.floor((time / values.duration) * (samples.length - 1)))
  const currentPoint = samples[currentIndex]
  const rms = Math.sqrt(currentPoint.r2)

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
                const extent = Math.max(2, ...samples.map(sample => Math.max(Math.abs(sample.x), Math.abs(sample.y))))
                const scale = Math.min(width, height) * 0.34 / extent

                const backgroundSeed = createGenerator(20260317)
                for (let index = 0; index < 80; index += 1) {
                  const bx = backgroundSeed() * width
                  const by = backgroundSeed() * height
                  const pulse = Math.sin(time * 2 + index) * 3
                  ctx.fillStyle = 'rgba(49, 92, 168, 0.12)'
                  ctx.beginPath()
                  ctx.arc(bx + pulse, by - pulse, 2.4, 0, Math.PI * 2)
                  ctx.fill()
                }

                ctx.strokeStyle = 'rgba(49, 92, 168, 0.28)'
                ctx.lineWidth = 2.2
                ctx.beginPath()
                samples.slice(0, currentIndex + 1).forEach((sample, index) => {
                  const x = centerX + sample.x * scale
                  const y = centerY - sample.y * scale
                  if (index === 0) {
                    ctx.moveTo(x, y)
                  } else {
                    ctx.lineTo(x, y)
                  }
                })
                ctx.stroke()

                ctx.fillStyle = '#3f6f55'
                ctx.beginPath()
                ctx.arc(centerX + currentPoint.x * scale, centerY - currentPoint.y * scale, 12 + values.radius * 2, 0, Math.PI * 2)
                ctx.fill()

                ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
                ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
                ctx.fillText(`D ≈ ${diffusion.toFixed(2)}`, 24, 28)
                ctx.fillText(`RMS = ${rms.toFixed(2)}`, 24, 48)
                ctx.fillText('背景分子热运动越剧烈，主颗粒随机漂移越明显', 24, 68)
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">扩散强度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {diffusion.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">均方根位移</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {rms.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">当前 r²</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {currentPoint.r2.toFixed(2)}
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
              温度越高、颗粒越小、液体越“稀”，随机位移就越明显。这里用的是统计意义上的可视化，所以单次轨迹不规则，但整体趋势仍服从扩散关系。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={samples.map(sample => ({ t: sample.t, v: sample.r2 }))}
        label="均方位移 r²"
        unit=""
        color="#3f6f55"
        xLabel="t (s)"
      />
    </div>
  )
}
