import { useEffect, useRef } from 'react'

interface DataPoint {
  t: number
  v: number
}

interface RealtimeGraphProps {
  data: DataPoint[]
  label: string
  unit: string
  color: string
  height?: number
  yRange?: [number, number]
  xLabel?: string
  placeholder?: string
  xFormatter?: (value: number) => string
  yFormatter?: (value: number) => string
}

export default function RealtimeGraph({
  data,
  label,
  unit,
  color,
  height = 180,
  yRange,
  xLabel = 't (s)',
  placeholder = '等待数据...',
  xFormatter = value => value.toFixed(1),
  yFormatter = value => value.toFixed(2),
}: RealtimeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const uiFont = '"Avenir Next", "PingFang SC", "Noto Sans SC", sans-serif'

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const width = rect.width
    const graphHeight = height
    const padding = { top: 28, right: 16, bottom: 34, left: 46 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = graphHeight - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, graphHeight)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.76)'
    ctx.fillRect(0, 0, width, graphHeight)

    if (data.length < 2) {
      ctx.fillStyle = 'rgba(94, 85, 73, 0.9)'
      ctx.font = `13px ${uiFont}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(placeholder, width / 2, graphHeight / 2)
      return
    }

    const xMin = data[0].t
    const xMax = data[data.length - 1].t

    let minY = 0
    let maxY = 1
    if (yRange) {
      ;[minY, maxY] = yRange
    } else {
      const values = data.map(point => point.v)
      minY = Math.min(...values)
      maxY = Math.max(...values)
      const margin = (maxY - minY) * 0.15 || 1
      minY -= margin
      maxY += margin
    }

    const toX = (value: number) =>
      padding.left + ((value - xMin) / (xMax - xMin || 1)) * plotWidth
    const toY = (value: number) =>
      padding.top + (1 - (value - minY) / (maxY - minY || 1)) * plotHeight

    ctx.strokeStyle = 'rgba(64, 52, 36, 0.12)'
    ctx.lineWidth = 1
    for (let index = 0; index <= 4; index += 1) {
      const y = padding.top + (plotHeight * index) / 4
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    if (minY < 0 && maxY > 0) {
      ctx.strokeStyle = 'rgba(64, 52, 36, 0.22)'
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(padding.left, toY(0))
      ctx.lineTo(width - padding.right, toY(0))
      ctx.stroke()
      ctx.setLineDash([])
    }

    const path = new Path2D()
    data.forEach((point, index) => {
      const x = toX(point.t)
      const y = toY(point.v)
      if (index === 0) {
        path.moveTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    })

    const areaPath = new Path2D(path)
    areaPath.lineTo(toX(data[data.length - 1].t), graphHeight - padding.bottom)
    areaPath.lineTo(toX(data[0].t), graphHeight - padding.bottom)
    areaPath.closePath()

    const fillGradient = ctx.createLinearGradient(0, padding.top, 0, graphHeight - padding.bottom)
    fillGradient.addColorStop(0, `${color}33`)
    fillGradient.addColorStop(1, `${color}00`)
    ctx.fillStyle = fillGradient
    ctx.fill(areaPath)

    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke(path)

    const last = data[data.length - 1]
    const lastX = toX(last.t)
    const lastY = toY(last.v)
    ctx.beginPath()
    ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = 'rgba(94, 85, 73, 0.92)'
    ctx.font = `11px ${uiFont}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let index = 0; index <= 4; index += 1) {
      const value = maxY - ((maxY - minY) * index) / 4
      const y = padding.top + (plotHeight * index) / 4
      ctx.fillText(yFormatter(value), padding.left - 8, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let index = 0; index <= 4; index += 1) {
      const value = xMin + ((xMax - xMin) * index) / 4
      const x = padding.left + (plotWidth * index) / 4
      ctx.fillText(xFormatter(value), x, graphHeight - padding.bottom + 8)
    }

    ctx.fillStyle = 'rgba(94, 85, 73, 0.9)'
    ctx.font = `12px ${uiFont}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${label}${unit ? ` (${unit})` : ''}`, padding.left, 16)
    ctx.textAlign = 'right'
    ctx.fillText(xLabel, width - padding.right, graphHeight - 8)
    ctx.font = `600 12px ${uiFont}`
    ctx.fillStyle = color
    ctx.fillText(yFormatter(last.v), width - padding.right, 16)
  }, [color, data, height, label, placeholder, unit, xFormatter, xLabel, yFormatter, yRange])

  return (
    <div ref={containerRef} className="lab-panel rounded-[1.5rem] p-3">
      <canvas ref={canvasRef} className="w-full rounded-[1.1rem]" />
    </div>
  )
}
