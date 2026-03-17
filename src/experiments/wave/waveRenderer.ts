import type { WaveParams } from './waveEngine'

const uiFont = '"Avenir Next", "PingFang SC", "Noto Sans SC", sans-serif'

export function drawWave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: number[],
  params: WaveParams,
  time: number,
  options: {
    stringLength: number
    wavelength: number
    showParticles?: boolean
    showWavelength?: boolean
    trackedIndex?: number
  },
) {
  const count = points.length
  if (count < 2) {
    return
  }

  ctx.clearRect(0, 0, width, height)

  const padding = { top: 44, right: 42, bottom: 40, left: 54 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const baselineY = padding.top + plotHeight / 2
  const xScale = plotWidth / (count - 1)
  const maxObserved = Math.max(
    params.amplitude * 1.35,
    ...points.map(value => Math.abs(value)),
    0.12,
  )
  const yScale = plotHeight / (2 * maxObserved)

  const toX = (index: number) => padding.left + index * xScale
  const toY = (value: number) => baselineY - value * yScale

  ctx.fillStyle = '#0f1726'
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height, padding, plotWidth, plotHeight, baselineY, options.stringLength, maxObserved)
  drawBoundary(ctx, padding.left, padding.top, plotHeight, params.boundaryLeft)
  drawBoundary(ctx, width - padding.right, padding.top, plotHeight, params.boundaryRight)

  const sampled = points.map((value, index) => ({ x: toX(index), y: toY(value), value }))
  const curve = new Path2D()
  curve.moveTo(sampled[0].x, sampled[0].y)

  for (let index = 0; index < sampled.length - 1; index += 1) {
    const current = sampled[index]
    const next = sampled[index + 1]
    const midX = (current.x + next.x) / 2
    const midY = (current.y + next.y) / 2
    curve.quadraticCurveTo(current.x, current.y, midX, midY)
  }
  const last = sampled[sampled.length - 1]
  curve.lineTo(last.x, last.y)

  const fillPath = new Path2D(curve)
  fillPath.lineTo(last.x, baselineY)
  fillPath.lineTo(sampled[0].x, baselineY)
  fillPath.closePath()

  const fillGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight)
  fillGradient.addColorStop(0, 'rgba(90, 166, 255, 0.26)')
  fillGradient.addColorStop(1, 'rgba(90, 166, 255, 0.02)')
  ctx.fillStyle = fillGradient
  ctx.fill(fillPath)

  ctx.save()
  ctx.shadowColor = 'rgba(78, 162, 255, 0.24)'
  ctx.shadowBlur = 22
  ctx.strokeStyle = '#7db7ff'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(curve)
  ctx.restore()

  if (options.showParticles) {
    drawParticles(ctx, sampled, maxObserved)
  }

  if (options.trackedIndex !== undefined && options.trackedIndex < sampled.length) {
    const point = sampled[options.trackedIndex]
    ctx.save()
    ctx.strokeStyle = 'rgba(252, 191, 73, 0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.moveTo(point.x, baselineY)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#fcbf49'
    ctx.shadowColor = 'rgba(252, 191, 73, 0.55)'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(point.x, point.y, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (options.showWavelength && params.boundaryLeft === 'driven') {
    drawWavelengthMarker(ctx, padding.left + plotWidth * 0.12, padding.top + 24, options.wavelength, options.stringLength, plotWidth)
  }

  drawInfo(ctx, width, padding, time, params, options.wavelength)
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  plotWidth: number,
  plotHeight: number,
  baselineY: number,
  stringLength: number,
  maxObserved: number,
) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1

  for (let index = 0; index <= 5; index += 1) {
    const x = padding.left + (plotWidth * index) / 5
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, padding.top + plotHeight)
    ctx.stroke()
  }

  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (plotHeight * index) / 4
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(252, 191, 73, 0.28)'
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(padding.left, baselineY)
  ctx.lineTo(width - padding.right, baselineY)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(235, 240, 248, 0.76)'
  ctx.font = `11px ${uiFont}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let index = 0; index <= 5; index += 1) {
    const value = (stringLength * index) / 5
    const x = padding.left + (plotWidth * index) / 5
    ctx.fillText(`${value.toFixed(0)} m`, x, height - padding.bottom + 10)
  }

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let index = 0; index <= 4; index += 1) {
    const value = maxObserved - ((maxObserved * 2) * index) / 4
    const y = padding.top + (plotHeight * index) / 4
    if (Math.abs(value) > 0.001) {
      ctx.fillText(value.toFixed(1), padding.left - 10, y)
    }
  }
  ctx.restore()
}

function drawBoundary(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  plotHeight: number,
  type: 'fixed' | 'free' | 'driven',
) {
  ctx.save()

  if (type === 'free') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, top + plotHeight / 2, 12, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
  } else {
    ctx.fillStyle = type === 'driven' ? 'rgba(124, 180, 255, 0.24)' : 'rgba(255,255,255,0.12)'
    ctx.strokeStyle = type === 'driven' ? 'rgba(124, 180, 255, 0.85)' : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.fillRect(x - 6, top, 12, plotHeight)
    ctx.strokeRect(x - 6, top, 12, plotHeight)
  }

  ctx.restore()
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  sampled: { x: number; y: number; value: number }[],
  maxObserved: number,
) {
  ctx.save()
  const stride = Math.max(1, Math.floor(sampled.length / 44))

  for (let index = 0; index < sampled.length; index += stride) {
    const point = sampled[index]
    const strength = Math.min(Math.abs(point.value) / maxObserved, 1)
    ctx.fillStyle =
      point.value >= 0
        ? `rgba(125, 183, 255, ${0.35 + strength * 0.45})`
        : `rgba(252, 191, 73, ${0.28 + strength * 0.42})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawWavelengthMarker(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  wavelength: number,
  stringLength: number,
  plotWidth: number,
) {
  if (wavelength <= 0) {
    return
  }

  const lengthPx = (wavelength / stringLength) * plotWidth
  if (lengthPx < 18 || lengthPx > plotWidth * 0.72) {
    return
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(252, 191, 73, 0.85)'
  ctx.fillStyle = 'rgba(252, 191, 73, 0.92)'
  ctx.lineWidth = 1.6

  ctx.beginPath()
  ctx.moveTo(startX, y)
  ctx.lineTo(startX + lengthPx, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(startX, y)
  ctx.lineTo(startX + 8, y - 4)
  ctx.lineTo(startX + 8, y + 4)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(startX + lengthPx, y)
  ctx.lineTo(startX + lengthPx - 8, y - 4)
  ctx.lineTo(startX + lengthPx - 8, y + 4)
  ctx.closePath()
  ctx.fill()

  ctx.font = `600 12px ${uiFont}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`λ = ${wavelength.toFixed(2)} m`, startX + lengthPx / 2, y - 6)
  ctx.restore()
}

function drawInfo(
  ctx: CanvasRenderingContext2D,
  width: number,
  padding: { top: number; right: number; bottom: number; left: number },
  time: number,
  params: WaveParams,
  wavelength: number,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(width - padding.right - 180, padding.top - 12, 180, 74, 16)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(241, 245, 249, 0.92)'
  ctx.font = `12px ${uiFont}`
  ctx.textAlign = 'right'
  ctx.fillText(`t = ${time.toFixed(2)} s`, width - padding.right - 14, padding.top + 10)
  ctx.fillText(`f = ${params.frequency.toFixed(1)} Hz`, width - padding.right - 14, padding.top + 30)
  ctx.fillText(`λ = ${wavelength.toFixed(2)} m`, width - padding.right - 14, padding.top + 50)

  ctx.textAlign = 'left'
  ctx.font = `11px ${uiFont}`
  ctx.fillStyle = 'rgba(235, 240, 248, 0.64)'
  ctx.fillText('驱动端', padding.left - 10, padding.top - 18)
  ctx.fillText(params.boundaryRight === 'fixed' ? '固定端' : '自由端', width - padding.right - 26, padding.top - 18)
  ctx.restore()
}
