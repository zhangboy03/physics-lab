import { useCallback, useEffect, useState } from 'react'

interface PlaybackOptions {
  duration: number
  speed?: number
  loop?: boolean
  autoStart?: boolean
}

export default function usePlayback({
  duration,
  speed = 1,
  loop = false,
  autoStart = true,
}: PlaybackOptions) {
  const [time, setTime] = useState(0)
  const [running, setRunning] = useState(autoStart)
  const safeDuration = Math.max(duration, 0)

  useEffect(() => {
    if (!running) {
      return undefined
    }

    let frame = 0
    let previous = 0

    const animate = (timestamp: number) => {
      if (previous === 0) {
        previous = timestamp
      }

      const elapsed = Math.min((timestamp - previous) / 1000, 0.05)
      previous = timestamp
      let reachedEnd = false

      setTime(current => {
        const next = current + elapsed * speed
        if (safeDuration <= 0) {
          return 0
        }

        if (loop) {
          return next % safeDuration
        }

        if (next >= safeDuration) {
          reachedEnd = true
          return safeDuration
        }

        return next
      })

      if (reachedEnd) {
        setRunning(false)
      }

      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(frame)
  }, [loop, running, safeDuration, speed])

  const reset = useCallback((nextRunning = true) => {
    setTime(0)
    setRunning(nextRunning)
  }, [])

  const currentTime =
    safeDuration <= 0
      ? 0
      : loop
        ? time % safeDuration
        : Math.min(time, safeDuration)

  return {
    time: currentTime,
    running,
    setRunning,
    reset,
  }
}
