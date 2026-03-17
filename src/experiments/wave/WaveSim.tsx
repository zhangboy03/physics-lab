import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ParamDef } from '../types'
import ControlPanel from '../../components/ControlPanel'
import FormulaCard from '../../components/FormulaCard'
import RealtimeGraph from '../../components/RealtimeGraph'
import { createWaveEngine, type WaveParams } from './waveEngine'
import { drawWave } from './waveRenderer'

const paramDefs: ParamDef[] = [
  { key: 'frequency', label: '频率 f', min: 0.4, max: 5, step: 0.1, defaultValue: 1.6, unit: 'Hz' },
  { key: 'amplitude', label: '振幅 A', min: 0.1, max: 1.2, step: 0.05, defaultValue: 0.45, unit: 'm' },
  { key: 'waveSpeed', label: '波速 v', min: 1, max: 10, step: 0.5, defaultValue: 4.5, unit: 'm/s' },
  { key: 'damping', label: '阻尼 b', min: 0, max: 1.2, step: 0.02, defaultValue: 0.08, unit: '' },
]

const formulas = [
  String.raw`y(x,t) = A\sin(\omega t - kx)`,
  String.raw`\lambda = \frac{v}{f}`,
  String.raw`T = \frac{1}{f}`,
  String.raw`v = \lambda f`,
]

const NUM_POINTS = 240
const TRACKED_INDEX = Math.floor(NUM_POINTS * 0.62)
const MAX_GRAPH_POINTS = 420

function buildWaveParams(
  values: Record<string, number>,
  mode: 'continuous' | 'pulse',
  boundaryRight: 'fixed' | 'free',
): WaveParams {
  return {
    frequency: values.frequency ?? 1.6,
    amplitude: values.amplitude ?? 0.45,
    waveSpeed: values.waveSpeed ?? 4.5,
    damping: values.damping ?? 0.08,
    boundaryLeft: mode === 'continuous' ? 'driven' : 'fixed',
    boundaryRight,
  }
}

export default function WaveSim() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {}
    for (const param of paramDefs) {
      defaults[param.key] = param.defaultValue
    }
    return defaults
  })
  const [running, setRunning] = useState(true)
  const [mode, setMode] = useState<'continuous' | 'pulse'>('continuous')
  const [boundaryRight, setBoundaryRight] = useState<'fixed' | 'free'>('fixed')
  const [showParticles, setShowParticles] = useState(false)
  const [graphData, setGraphData] = useState<{ t: number; v: number }[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef(
    createWaveEngine(buildWaveParams(values, 'continuous', 'fixed'), NUM_POINTS),
  )
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)
  const graphAccumulatorRef = useRef(0)
  const draggingRef = useRef(false)

  const waveParams = buildWaveParams(values, mode, boundaryRight)
  const wavelength = waveParams.waveSpeed / Math.max(waveParams.frequency, 0.001)
  const period = 1 / Math.max(waveParams.frequency, 0.001)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    engineRef.current.setParams(waveParams)
  }, [waveParams])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    drawWave(ctx, width, height, engine.getPoints(), waveParams, engine.getTime(), {
      stringLength: engine.getLength(),
      wavelength: engine.getWavelength(),
      showParticles,
      showWavelength: mode === 'continuous',
      trackedIndex: TRACKED_INDEX,
    })
  }, [mode, showParticles, waveParams])

  useEffect(() => {
    const animate = (timestamp: number) => {
      const engine = engineRef.current

      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp
      }

      const elapsed = Math.min((timestamp - lastFrameRef.current) / 1000, 0.04)
      lastFrameRef.current = timestamp

      if (running) {
        engine.step(elapsed)
        graphAccumulatorRef.current += elapsed

        if (graphAccumulatorRef.current >= 0.045) {
          const points = engine.getPoints()
          setGraphData(previous => {
            const next = [
              ...previous,
              { t: engine.getTime(), v: points[TRACKED_INDEX] ?? 0 },
            ]
            return next.length > MAX_GRAPH_POINTS
              ? next.slice(-MAX_GRAPH_POINTS)
              : next
          })
          graphAccumulatorRef.current = 0
        }
      }

      drawFrame()
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawFrame, running])

  useEffect(() => {
    drawFrame()
  }, [drawFrame])

  const handleParamChange = useCallback((key: string, value: number) => {
    setValues(previous => ({ ...previous, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    engineRef.current.reset()
    setGraphData([])
    graphAccumulatorRef.current = 0
    lastFrameRef.current = 0
    drawFrame()
  }, [drawFrame])

  const applyDrag = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const padding = { top: 44, right: 42, bottom: 40, left: 54 }
      const plotWidth = width - padding.left - padding.right
      const plotHeight = height - padding.top - padding.bottom
      const baselineY = padding.top + plotHeight / 2

      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const ratio = (mouseX - padding.left) / plotWidth
      if (ratio < 0 || ratio > 1) {
        return
      }

      const index = Math.round(ratio * (engineRef.current.numPoints - 1))
      const maxObserved = Math.max(values.amplitude * 1.35, 0.12)
      const displacement = ((baselineY - mouseY) / (plotHeight / 2)) * maxObserved

      engineRef.current.disturb(index, displacement * 0.45, 10)
      drawFrame()
    },
    [drawFrame, values.amplitude],
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'pulse') {
        return
      }
      draggingRef.current = true
      applyDrag(event)
    },
    [applyDrag, mode],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current || mode !== 'pulse') {
        return
      }
      applyDrag(event)
    },
    [applyDrag, mode],
  )

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="lab-panel-dark rounded-[1.6rem] p-0">
            <div ref={containerRef} className="h-[470px] overflow-hidden rounded-[1.6rem]">
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: mode === 'pulse' ? 'crosshair' : 'default' }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">波长 λ</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {wavelength.toFixed(2)} m
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">周期 T</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {period.toFixed(2)} s
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">右端边界</div>
              <div className="mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {boundaryRight === 'fixed' ? '固定端' : '自由端'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={paramDefs}
            values={values}
            onChange={handleParamChange}
            running={running}
            onToggle={() => setRunning(current => !current)}
            onReset={handleReset}
          >
            <div>
              <div className="text-[13px] font-medium text-[var(--color-ink)]">模式</div>
              <div className="segmented mt-3">
                <button
                  type="button"
                  className={mode === 'continuous' ? 'is-active' : ''}
                  onClick={() => {
                    setMode('continuous')
                    handleReset()
                  }}
                >
                  连续波
                </button>
                <button
                  type="button"
                  className={mode === 'pulse' ? 'is-active' : ''}
                  onClick={() => {
                    setMode('pulse')
                    handleReset()
                  }}
                >
                  脉冲
                </button>
              </div>
            </div>

            <div>
              <div className="text-[13px] font-medium text-[var(--color-ink)]">右端边界</div>
              <div className="segmented mt-3">
                <button
                  type="button"
                  className={boundaryRight === 'fixed' ? 'is-active' : ''}
                  onClick={() => setBoundaryRight('fixed')}
                >
                  固定端
                </button>
                <button
                  type="button"
                  className={boundaryRight === 'free' ? 'is-active' : ''}
                  onClick={() => setBoundaryRight('free')}
                >
                  自由端
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] px-4 py-3">
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">质点视图</div>
                <div className="text-[12px] text-[var(--color-ink-soft)]">
                  {showParticles ? '显示离散质点' : '显示连续弦线'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowParticles(current => !current)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  showParticles ? 'bg-[var(--color-accent-blue)]' : 'bg-[rgba(64,52,36,0.18)]'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    showParticles ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              {mode === 'continuous'
                ? '连续波模式下，左端会持续驱动弦振动。优先观察频率变化如何影响波长。'
                : '脉冲模式下，可以在弦上拖拽打出局部扰动，观察它在固定端与自由端的反射差异。'}
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={graphData}
        label="观测点位移 y"
        unit="m"
        color="#315ca8"
        height={160}
        yRange={[-Math.max(values.amplitude * 1.4, 0.2), Math.max(values.amplitude * 1.4, 0.2)]}
        xLabel="t (s)"
      />
    </div>
  )
}
