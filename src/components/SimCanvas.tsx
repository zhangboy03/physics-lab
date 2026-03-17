import { useRef, useEffect, useCallback } from 'react'

interface SimCanvasProps {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onMouseDown?: (x: number, y: number, w: number, h: number) => void;
  onMouseMove?: (x: number, y: number, w: number, h: number) => void;
  onMouseUp?: () => void;
  className?: string;
}

export default function SimCanvas({ draw, onMouseDown, onMouseMove, onMouseUp, className }: SimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    draw(ctx, w, h)
    ctx.restore()
  })

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div ref={containerRef} className={`canvas-shell w-full h-full ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full rounded-[1.4rem]"
        onMouseDown={(e) => {
          if (!onMouseDown) return
          const { x, y } = getPos(e)
          const rect = canvasRef.current!.getBoundingClientRect()
          onMouseDown(x, y, rect.width, rect.height)
        }}
        onMouseMove={(e) => {
          if (!onMouseMove) return
          const { x, y } = getPos(e)
          const rect = canvasRef.current!.getBoundingClientRect()
          onMouseMove(x, y, rect.width, rect.height)
        }}
        onMouseUp={() => onMouseUp?.()}
        onMouseLeave={() => onMouseUp?.()}
      />
    </div>
  )
}
