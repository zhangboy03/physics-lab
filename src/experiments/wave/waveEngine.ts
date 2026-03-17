export interface WaveParams {
  frequency: number
  amplitude: number
  waveSpeed: number
  damping: number
  boundaryLeft: 'fixed' | 'free' | 'driven'
  boundaryRight: 'fixed' | 'free'
}

export function createWaveEngine(params: WaveParams, numPoints = 240) {
  const num = numPoints
  const length = 10

  let p = { ...params }
  let time = 0
  let accumulator = 0

  const y = new Float64Array(num)
  const velocity = new Float64Array(num)
  const acceleration = new Float64Array(num)

  let dx = length / (num - 1)
  let dt = 1 / 240
  let stiffness = 1

  function recomputeConstants() {
    dx = length / (num - 1)
    dt = Math.min(1 / 240, 0.45 * dx / Math.max(p.waveSpeed, 0.05))
    stiffness = (p.waveSpeed * p.waveSpeed) / (dx * dx)
    accumulator = 0
  }

  function getDrivenDisplacement(atTime: number) {
    return p.amplitude * Math.sin(2 * Math.PI * p.frequency * atTime)
  }

  function getDrivenVelocity(atTime: number) {
    return (
      2 *
      Math.PI *
      p.frequency *
      p.amplitude *
      Math.cos(2 * Math.PI * p.frequency * atTime)
    )
  }

  function applyBoundaries() {
    if (p.boundaryLeft === 'driven') {
      y[0] = getDrivenDisplacement(time)
      velocity[0] = getDrivenVelocity(time)
    } else if (p.boundaryLeft === 'free') {
      y[0] = y[1]
      velocity[0] = velocity[1]
    } else {
      y[0] = 0
      velocity[0] = 0
    }

    if (p.boundaryRight === 'free') {
      y[num - 1] = y[num - 2]
      velocity[num - 1] = velocity[num - 2]
    } else {
      y[num - 1] = 0
      velocity[num - 1] = 0
    }
  }

  function substep(stepDt: number) {
    for (let index = 1; index < num - 1; index += 1) {
      const laplacian = y[index - 1] - 2 * y[index] + y[index + 1]
      acceleration[index] = stiffness * laplacian - p.damping * velocity[index]
    }

    for (let index = 1; index < num - 1; index += 1) {
      velocity[index] += acceleration[index] * stepDt
      y[index] += velocity[index] * stepDt
    }

    time += stepDt
    applyBoundaries()
  }

  recomputeConstants()
  applyBoundaries()

  return {
    step(elapsed: number) {
      accumulator += elapsed
      let steps = 0

      while (accumulator >= dt && steps < 1200) {
        substep(dt)
        accumulator -= dt
        steps += 1
      }

      return steps
    },

    getPoints() {
      return Array.from(y)
    },

    getTime() {
      return time
    },

    getLength() {
      return length
    },

    getWavelength() {
      return p.waveSpeed / Math.max(p.frequency, 0.001)
    },

    getPeriod() {
      return 1 / Math.max(p.frequency, 0.001)
    },

    setParams(newParams: WaveParams) {
      p = { ...newParams }
      recomputeConstants()
      applyBoundaries()
    },

    reset() {
      y.fill(0)
      velocity.fill(0)
      acceleration.fill(0)
      time = 0
      accumulator = 0
      applyBoundaries()
    },

    disturb(index: number, displacement: number, sigma = 8) {
      for (let point = 0; point < num; point += 1) {
        const distance = (point - index) / sigma
        const envelope = Math.exp(-0.5 * distance * distance)
        y[point] += displacement * envelope
      }
      applyBoundaries()
    },

    numPoints: num,
  }
}
