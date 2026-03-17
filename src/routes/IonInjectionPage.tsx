import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import ControlPanel from '../components/ControlPanel'

type ParticleId = 'b-plus' | 'bf2-plus'
type ExitKind = 'wafer' | 'outer' | 'inner' | 'unknown'

interface ParticleDefinition {
  id: ParticleId
  label: string
  massFactor: number
  color: string
}

interface PathPoint {
  x: number
  y: number
}

interface PathResult {
  speed: number
  radius: number
  exitKind: ExitKind
  exitPoint: PathPoint
  path: PathPoint[]
}

const particles: ParticleDefinition[] = [
  { id: 'b-plus', label: 'B⁺', massFactor: 11, color: '#c45a28' },
  { id: 'bf2-plus', label: 'BF₂⁺', massFactor: 49, color: '#315ca8' },
]

const controlParams = [
  { key: 'U', label: '加速电压 U', min: 1, max: 12, step: 0.2, defaultValue: 4, unit: 'arb.' },
  { key: 'r', label: '内半径 r', min: 0.8, max: 2, step: 0.05, defaultValue: 1, unit: 'arb.' },
  { key: 'B', label: '磁感应强度 B', min: 0.6, max: 8, step: 0.1, defaultValue: 3, unit: 'arb.' },
]

function computeSpeed(massFactor: number, voltage: number) {
  return Math.sqrt((2 * voltage) / massFactor)
}

function computeRadius(massFactor: number, voltage: number, magneticField: number) {
  const speed = computeSpeed(massFactor, voltage)
  return (massFactor * speed) / Math.max(magneticField, 0.001)
}

function computeMatchingField(voltage: number, innerRadius: number) {
  return Math.sqrt((11 * voltage) / 2) / Math.max(innerRadius, 0.001)
}

function pointOnTrajectory(innerRadius: number, radius: number, angle: number): PathPoint {
  return {
    x: radius * Math.sin(angle),
    y: 2 * innerRadius - radius + radius * Math.cos(angle),
  }
}

function radialDistance(point: PathPoint) {
  return Math.hypot(point.x, point.y)
}

function refineIntersection(
  low: number,
  high: number,
  evaluator: (angle: number) => number,
) {
  let left = low
  let right = high
  let leftValue = evaluator(left)

  for (let count = 0; count < 28; count += 1) {
    const mid = (left + right) / 2
    const midValue = evaluator(mid)
    if (leftValue === 0 || Math.sign(leftValue) === Math.sign(midValue)) {
      left = mid
      leftValue = midValue
    } else {
      right = mid
    }
  }

  return (left + right) / 2
}

function computeParticlePath(
  massFactor: number,
  voltage: number,
  magneticField: number,
  innerRadius: number,
): PathResult {
  const speed = computeSpeed(massFactor, voltage)
  const radius = computeRadius(massFactor, voltage, magneticField)
  const outerRadius = innerRadius * 3
  const maxAngle = Math.PI * 0.98
  const steps = 1600
  const path: PathPoint[] = [pointOnTrajectory(innerRadius, radius, 0)]

  let previousAngle = 0
  let previousPoint = path[0]

  for (let index = 1; index <= steps; index += 1) {
    const angle = (maxAngle * index) / steps
    const point = pointOnTrajectory(innerRadius, radius, angle)
    const currentDistance = radialDistance(point)
    const previousDistance = radialDistance(previousPoint)

    if (previousDistance < outerRadius && currentDistance >= outerRadius) {
      const refinedAngle = refineIntersection(
        previousAngle,
        angle,
        current => radialDistance(pointOnTrajectory(innerRadius, radius, current)) - outerRadius,
      )
      const exitPoint = pointOnTrajectory(innerRadius, radius, refinedAngle)
      path.push(exitPoint)
      return { speed, radius, exitKind: 'outer', exitPoint, path }
    }

    if (previousDistance > innerRadius && currentDistance <= innerRadius) {
      const refinedAngle = refineIntersection(
        previousAngle,
        angle,
        current => radialDistance(pointOnTrajectory(innerRadius, radius, current)) - innerRadius,
      )
      const exitPoint = pointOnTrajectory(innerRadius, radius, refinedAngle)
      path.push(exitPoint)
      return { speed, radius, exitKind: 'inner', exitPoint, path }
    }

    if (previousPoint.y > 0 && point.y <= 0) {
      const refinedAngle = refineIntersection(
        previousAngle,
        angle,
        current => pointOnTrajectory(innerRadius, radius, current).y,
      )
      const exitPoint = pointOnTrajectory(innerRadius, radius, refinedAngle)
      path.push(exitPoint)
      return {
        speed,
        radius,
        exitKind:
          exitPoint.x >= innerRadius && exitPoint.x <= outerRadius ? 'wafer' : 'unknown',
        exitPoint,
        path,
      }
    }

    path.push(point)
    previousAngle = angle
    previousPoint = point
  }

  return {
    speed,
    radius,
    exitKind: 'unknown',
    exitPoint: previousPoint,
    path,
  }
}

function drawIonAnalyzer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  innerRadius: number,
  fieldStrength: number,
  results: Record<ParticleId, PathResult>,
  phase: number,
  showBoth: boolean,
  focus: ParticleId,
) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f7f1e6'
  ctx.fillRect(0, 0, width, height)

  const outerRadius = innerRadius * 3
  const scale = Math.min((width * 0.5) / outerRadius, (height * 0.48) / outerRadius)
  const originX = width * 0.28
  const originY = height * 0.72
  const toX = (value: number) => originX + value * scale
  const toY = (value: number) => originY - value * scale

  ctx.fillStyle = 'rgba(49, 92, 168, 0.09)'
  ctx.beginPath()
  ctx.moveTo(toX(innerRadius), toY(0))
  ctx.arc(originX, originY, outerRadius * scale, 0, -Math.PI / 2, true)
  ctx.lineTo(toX(0), toY(innerRadius))
  ctx.arc(originX, originY, innerRadius * scale, -Math.PI / 2, 0, false)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(49, 92, 168, 0.58)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(originX, originY, outerRadius * scale, 0, -Math.PI / 2, true)
  ctx.arc(originX, originY, innerRadius * scale, -Math.PI / 2, 0, false)
  ctx.stroke()

  ctx.save()
  ctx.setLineDash([4, 8])
  ctx.strokeStyle = 'rgba(49, 92, 168, 0.18)'
  for (let ratio = 1; ratio < 5; ratio += 1) {
    const x = originX + (outerRadius * scale * ratio) / 5
    ctx.beginPath()
    ctx.moveTo(x, toY(0))
    ctx.lineTo(x, toY(outerRadius))
    ctx.stroke()
  }
  ctx.restore()

  ctx.fillStyle = 'rgba(142, 57, 40, 0.12)'
  ctx.fillRect(width * 0.02, toY(2 * innerRadius) - 46, width * 0.12, 92)
  ctx.strokeStyle = 'rgba(142, 57, 40, 0.35)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(width * 0.02, toY(2 * innerRadius) - 46, width * 0.12, 92)

  ctx.strokeStyle = 'rgba(142, 57, 40, 0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(width * 0.14, toY(2 * innerRadius) - 30)
  ctx.lineTo(width * 0.14, toY(2 * innerRadius) + 30)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width * 0.19, toY(2 * innerRadius) - 30)
  ctx.lineTo(width * 0.19, toY(2 * innerRadius) + 30)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(142, 57, 40, 0.75)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(width * 0.165, toY(2 * innerRadius))
  ctx.lineTo(toX(0), toY(2 * innerRadius))
  ctx.stroke()

  ctx.fillStyle = 'rgba(63, 111, 85, 0.12)'
  ctx.fillRect(toX(innerRadius - 0.25 * innerRadius), toY(0) + 18, (outerRadius - innerRadius + 0.5 * innerRadius) * scale, 64)
  ctx.strokeStyle = 'rgba(63, 111, 85, 0.35)'
  ctx.strokeRect(toX(innerRadius - 0.25 * innerRadius), toY(0) + 18, (outerRadius - innerRadius + 0.5 * innerRadius) * scale, 64)

  const labels = [
    { text: 'O', point: { x: 0, y: 0 }, dx: -16, dy: 18 },
    { text: 'M', point: { x: 0, y: 2 * innerRadius }, dx: -20, dy: -12 },
    { text: 'N', point: { x: 2 * innerRadius, y: 0 }, dx: 6, dy: 18 },
    { text: 'c', point: { x: innerRadius, y: 0 }, dx: -4, dy: 18 },
    { text: 'd', point: { x: outerRadius, y: 0 }, dx: -4, dy: 18 },
  ]

  ctx.fillStyle = '#1f1c18'
  ctx.font = '600 12px "Avenir Next", "PingFang SC", sans-serif'
  labels.forEach(label => {
    ctx.fillText(label.text, toX(label.point.x) + label.dx, toY(label.point.y) + label.dy)
  })

  ctx.fillStyle = 'rgba(142, 57, 40, 0.85)'
  ctx.fillText('离子源', width * 0.05, toY(2 * innerRadius) - 56)
  ctx.fillText('加速电场', width * 0.12, toY(2 * innerRadius) + 58)
  ctx.fillStyle = 'rgba(49, 92, 168, 0.78)'
  ctx.fillText(`磁分析器  B = ${fieldStrength.toFixed(2)}`, toX(outerRadius * 0.95), toY(outerRadius * 0.95))
  ctx.fillStyle = 'rgba(63, 111, 85, 0.82)'
  ctx.fillText('晶圆所在水平面', toX(outerRadius * 0.94), toY(-0.22 * innerRadius))

  particles.forEach(particle => {
    if (!showBoth && particle.id !== focus) {
      return
    }

    const result = results[particle.id]
    const opacity = showBoth || particle.id === focus ? 1 : 0.35
    const { path } = result

    ctx.save()
    ctx.strokeStyle = `${particle.color}${opacity === 1 ? '' : '55'}`
    ctx.lineWidth = particle.id === focus ? 3.2 : 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    path.forEach((point, index) => {
      const x = toX(point.x)
      const y = toY(point.y)
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    const markerIndex = Math.min(path.length - 1, Math.floor((path.length - 1) * phase))
    const marker = path[markerIndex]
    ctx.fillStyle = particle.color
    ctx.shadowColor = particle.color
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(toX(marker.x), toY(marker.y), particle.id === focus ? 6 : 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = particle.color
    ctx.fillText(
      `${particle.label}  r = ${(result.radius / innerRadius).toFixed(2)}r`,
      toX(outerRadius * 0.62),
      toY(outerRadius * (particle.id === 'b-plus' ? 0.88 : 0.73)),
    )
  })
}

export default function IonInjectionPage() {
  const [values, setValues] = useState<Record<string, number>>({
    U: 4,
    r: 1,
    B: 3,
  })
  const [running, setRunning] = useState(true)
  const [lockFieldToProblem, setLockFieldToProblem] = useState(true)
  const [showBoth, setShowBoth] = useState(true)
  const [focus, setFocus] = useState<ParticleId>('bf2-plus')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(0)
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)

  const actualField = lockFieldToProblem
    ? computeMatchingField(values.U, values.r)
    : values.B

  const pathResults = {
    'b-plus': computeParticlePath(11, values.U, actualField, values.r),
    'bf2-plus': computeParticlePath(49, values.U, actualField, values.r),
  }

  const speedRatio = computeSpeed(11, values.U) / computeSpeed(49, values.U)
  const bPlusHitsTarget =
    pathResults['b-plus'].exitKind === 'wafer' &&
    Math.abs(pathResults['b-plus'].exitPoint.x - 2 * values.r) < values.r * 0.04
  const bf2Contaminates = pathResults['bf2-plus'].exitKind === 'wafer'
  const hypotheticalRadiusFromD = values.r * 3.25

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

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const results = {
      'b-plus': computeParticlePath(11, values.U, actualField, values.r),
      'bf2-plus': computeParticlePath(49, values.U, actualField, values.r),
    }

    drawIonAnalyzer(
      ctx,
      canvas.width / dpr,
      canvas.height / dpr,
      values.r,
      actualField,
      results,
      phaseRef.current,
      showBoth,
      focus,
    )
  }, [actualField, focus, showBoth, values.U, values.r])

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp
      }
      const elapsed = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05)
      lastFrameRef.current = timestamp

      if (running) {
        phaseRef.current = (phaseRef.current + elapsed * 0.28) % 1
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

  const handleReset = useCallback(() => {
    phaseRef.current = 0
    lastFrameRef.current = 0
    drawFrame()
  }, [drawFrame])

  return (
    <div className="space-y-6">
      <section className="lab-shell hero-grid paper-grid grain overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="section-eyebrow">Exam Problem Visualizer</div>
            <h1 className="display-title mt-5 text-[clamp(2.6rem,7vw,4.8rem)] leading-[0.94] text-[var(--color-ink)]">
              离子注入磁分析器
              <br />
              可视化解题页
            </h1>
            <p className="mt-4 max-w-[720px] text-[16px] leading-8 text-[var(--color-ink-soft)]">
              左边直接看题目与推导，右边拖动参数做磁分析器实验。这个页面的目标不是替学生代算，
              而是让学生自己把“速度不同、轨道半径不同、是否落入晶圆”这条逻辑链完整看见。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">速度比</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                7 : √11
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">题设半径</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                r₁ = 2r
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">结论</div>
              <div className="mt-3 text-[24px] font-semibold text-[var(--color-accent-green)]">
                BF₂⁺ 不入晶圆
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <section className="lab-panel rounded-[1.8rem] p-6">
            <div className="panel-caption">Problem</div>
            <h2 className="display-title mt-4 text-[2.2rem] text-[var(--color-ink)]">题目条件</h2>
            <div className="paper-rule mt-4" />
            <div className="mt-5 space-y-3 text-[15px] leading-8 text-[var(--color-ink-soft)]">
              <p>磁分析器为内外半径分别为 `r` 和 `3r` 的四分之一圆环，内部存在垂直纸面向外的匀强磁场。</p>
              <p>离子源击发 `BF₃` 气体后得到 `B⁺` 与 `BF₂⁺`，质量分别为 `11m`、`49m`，电荷量均为 `e`。</p>
              <p>离子先经加速电场，再从 `ab` 中点 `M` 水平向右进入磁分析器。已知 `B⁺` 恰好从 `cd` 中点 `N` 射出并垂直进入晶圆平面。</p>
              <p>求两种离子的速度大小之比，并判断 `BF₂⁺` 是否会被掺入晶圆。</p>
            </div>
          </section>

          <section className="lab-panel rounded-[1.8rem] p-6">
            <div className="panel-caption">Solution</div>
            <h2 className="display-title mt-4 text-[2.2rem] text-[var(--color-ink)]">解析路径</h2>
            <div className="paper-rule mt-4" />
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="panel-caption">Step 1</div>
                <p className="mt-3 text-[14px] leading-7 text-[var(--color-ink-soft)]">
                  加速过程满足 `eU = ½mv²`，因此速度与 `1/√m` 成正比。
                </p>
                <div className="formula-chip mono-data mt-3 px-4 py-3 text-[14px] text-[var(--color-ink)]">
                  v(B⁺) : v(BF₂⁺) = 7 : √11
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="panel-caption">Step 2</div>
                <p className="mt-3 text-[14px] leading-7 text-[var(--color-ink-soft)]">
                  由于 `B⁺` 从 `M` 进入、从 `N` 射出，它在磁场中的轨道半径必为 `2r`。
                </p>
                <div className="formula-chip mono-data mt-3 px-4 py-3 text-[14px] text-[var(--color-ink)]">
                  B = (1/r) √(11mU / 2e)
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="panel-caption">Step 3</div>
                <p className="mt-3 text-[14px] leading-7 text-[var(--color-ink-soft)]">
                  代入同一磁场后，`BF₂⁺` 的半径变为 `14√11/11 r`，比 `2r` 更大，弯折不足。
                </p>
                <div className="formula-chip mono-data mt-3 px-4 py-3 text-[14px] text-[var(--color-ink)]">
                  r(BF₂⁺) = 14√11 / 11 · r
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="panel-caption">Step 4</div>
                <p className="mt-3 text-[14px] leading-7 text-[var(--color-ink-soft)]">
                  如果它要刚好从 `d` 点射出，所需轨道半径只要 `13/4 r`。实际半径更大，所以它会先撞外弧，不能进入晶圆。
                </p>
                <div className="formula-chip mono-data mt-3 px-4 py-3 text-[14px] text-[var(--color-ink)]">
                  r(d) = 13 / 4 · r {'<'} r(BF₂⁺)
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="lab-panel rounded-[1.8rem] p-5 sm:p-6">
            <div className="panel-caption">Interactive Lab</div>
            <h2 className="display-title mt-4 text-[2.2rem] text-[var(--color-ink)]">磁分析器实验室</h2>
            <div className="paper-rule mt-4" />
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="canvas-shell h-[520px] p-0">
                <div ref={containerRef} className="h-full overflow-hidden rounded-[1.5rem]">
                  <canvas ref={canvasRef} className="h-full w-full" />
                </div>
              </div>

              <div className="space-y-4">
                <ControlPanel
                  params={controlParams}
                  values={values}
                  onChange={(key, value) => setValues(previous => ({ ...previous, [key]: value }))}
                  running={running}
                  onToggle={() => setRunning(current => !current)}
                  onReset={handleReset}
                >
                  <div className="flex items-center justify-between rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] px-4 py-3">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-ink)]">
                        题设磁场匹配
                      </div>
                      <div className="text-[12px] text-[var(--color-ink-soft)]">
                        自动让 B⁺ 命中 N 点
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockFieldToProblem(current => !current)}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        lockFieldToProblem
                          ? 'bg-[var(--color-accent-blue)]'
                          : 'bg-[rgba(64,52,36,0.18)]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          lockFieldToProblem ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-ink)]">显示方式</div>
                    <div className="segmented mt-3">
                      <button
                        type="button"
                        className={showBoth ? 'is-active' : ''}
                        onClick={() => setShowBoth(true)}
                      >
                        两种离子
                      </button>
                      <button
                        type="button"
                        className={!showBoth ? 'is-active' : ''}
                        onClick={() => setShowBoth(false)}
                      >
                        单独观察
                      </button>
                    </div>
                  </div>

                  {!showBoth ? (
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-ink)]">聚焦对象</div>
                      <div className="segmented mt-3">
                        <button
                          type="button"
                          className={focus === 'b-plus' ? 'is-active' : ''}
                          onClick={() => setFocus('b-plus')}
                        >
                          B⁺
                        </button>
                        <button
                          type="button"
                          className={focus === 'bf2-plus' ? 'is-active' : ''}
                          onClick={() => setFocus('bf2-plus')}
                        >
                          BF₂⁺
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                    {lockFieldToProblem
                      ? '现在采用题设磁场，B⁺ 会自动从 N 点射出。你可以重点观察 BF₂⁺ 的轨迹为什么会更“平”。'
                      : '现在关闭了题设匹配，可以自己改 B 看看只有在什么范围附近，B⁺ 才会接近命中 N 点。'}
                  </div>
                </ControlPanel>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="metric-tile">
              <div className="panel-caption">当前磁场</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {actualField.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">B⁺ 命中 N</div>
              <div className="mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {bPlusHitsTarget ? '是' : '否'}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">BF₂⁺ 半径</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {(pathResults['bf2-plus'].radius / values.r).toFixed(2)}r
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">BF₂⁺ 入晶圆</div>
              <div className="mt-3 text-[24px] font-semibold text-[var(--color-accent)]">
                {bf2Contaminates ? '会' : '不会'}
              </div>
            </div>
          </section>

          <section className="lab-panel rounded-[1.8rem] p-6">
            <div className="panel-caption">Observation Notes</div>
            <div className="paper-rule mt-4" />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                  速度比
                </div>
                <div className="mono-data mt-3 text-[22px] font-semibold text-[var(--color-ink)]">
                  {speedRatio.toFixed(2)} : 1
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  数值上对应 `7 : √11`，说明质量越大，同压加速后速度越小。
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                  B⁺ 轨道
                </div>
                <div className="mono-data mt-3 text-[22px] font-semibold text-[var(--color-ink)]">
                  {(pathResults['b-plus'].radius / values.r).toFixed(2)}r
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  题设匹配打开时应稳定接近 `2r`，这就是反推磁场的关键。
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] p-4">
                <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                  d 点临界半径
                </div>
                <div className="mono-data mt-3 text-[22px] font-semibold text-[var(--color-ink)]">
                  {(hypotheticalRadiusFromD / values.r).toFixed(2)}r
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  只要实际半径大于 `13/4 r`，轨迹就会先撞外弧，不能从 `cd` 射出。
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/" className="secondary-button">
          返回实验总览
        </Link>
        <Link to="/experiment/wave" className="secondary-button">
          继续看波动实验
        </Link>
      </div>
    </div>
  )
}
