export interface InterferenceParams {
  slitDistance: number;    // d: distance between two slits (0.5-5 units)
  wavelength: number;      // lambda: wavelength (0.5-3 units)
  screenDistance: number;  // L: distance from slits to screen (5-20 units)
  amplitude: number;       // A: wave amplitude (0.5-1.0)
}

export interface ScreenPoint {
  y: number;
  intensity: number;
}

/**
 * Double-slit interference engine.
 *
 * Two point sources at (0, +d/2) and (0, -d/2) emit circular waves.
 * Wave from source i at point (x, y):  A * sin(omega*t - k*r_i)
 * where r_i = sqrt(x^2 + (y - y_i)^2), k = 2*PI / lambda, omega = 2*PI * c / lambda.
 *
 * Intensity at the detection screen (x = L) is computed as the time-averaged
 * squared superposition of the two waves.
 */
export function createInterferenceEngine(params: InterferenceParams) {
  let p = { ...params };
  let time = 0;

  // Wave speed (arbitrary, chosen so wavefronts animate at a pleasant rate)
  const c = 3.0;

  function getK() {
    return (2 * Math.PI) / p.wavelength;
  }

  function getOmega() {
    return (2 * Math.PI * c) / p.wavelength;
  }

  /** Source positions: slit 1 at (0, +d/2), slit 2 at (0, -d/2). */
  function getSources(): [number, number][] {
    const halfD = p.slitDistance / 2;
    return [
      [0, -halfD],
      [0, halfD],
    ];
  }

  /**
   * Wave amplitude at point (x, y) at time t.
   * Returns the instantaneous superposition of both waves.
   */
  function getFieldAt(x: number, y: number, t: number): number {
    const k = getK();
    const omega = getOmega();
    const sources = getSources();
    let sum = 0;

    for (const [sx, sy] of sources) {
      const dx = x - sx;
      const dy = y - sy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 0.001) continue; // avoid singularity at source

      // Amplitude decays as 1/sqrt(r) for 2D circular waves
      const decay = 1 / Math.sqrt(r);
      sum += p.amplitude * decay * Math.sin(omega * t - k * r);
    }

    return sum;
  }

  /**
   * Compute the intensity pattern along the detection screen at x = L.
   * Uses the analytical formula for time-averaged intensity:
   *   I = 4 * A^2 * cos^2(delta / 2)
   * where delta = k * (r2 - r1) is the phase difference.
   *
   * Returns an array of { y, intensity } sampled along the screen.
   */
  function getScreenPattern(numPoints = 400): ScreenPoint[] {
    const k = getK();
    const sources = getSources();
    const L = p.screenDistance;

    // Screen spans enough to show several fringes
    // Fringe spacing ~ lambda * L / d
    const fringeSpacing = p.wavelength * L / Math.max(p.slitDistance, 0.01);
    const halfSpan = Math.max(fringeSpacing * 6, 5);

    const result: ScreenPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      const y = -halfSpan + (2 * halfSpan * i) / (numPoints - 1);

      // Distances from each slit to this screen point
      const r1 = Math.sqrt(L * L + (y - sources[0][1]) * (y - sources[0][1]));
      const r2 = Math.sqrt(L * L + (y - sources[1][1]) * (y - sources[1][1]));

      const delta = k * (r2 - r1);

      // Time-averaged intensity with 1/r decay (2D)
      const decay1 = 1 / Math.sqrt(r1);
      const decay2 = 1 / Math.sqrt(r2);
      // For approximately equal distances, simplify:
      const avgDecay = (decay1 + decay2) / 2;
      const intensity = 4 * p.amplitude * p.amplitude * avgDecay * avgDecay
        * Math.cos(delta / 2) * Math.cos(delta / 2);

      result.push({ y, intensity });
    }

    return result;
  }

  /**
   * Maximum intensity value in the screen pattern (for normalization).
   */
  function getMaxIntensity(): number {
    // At center: constructive, both decays ~ 1/sqrt(L)
    const L = p.screenDistance;
    const decay = 1 / Math.sqrt(L);
    return 4 * p.amplitude * p.amplitude * decay * decay;
  }

  /**
   * Fringe spacing on the screen (small-angle approximation).
   */
  function getFringeSpacing(): number {
    return (p.wavelength * p.screenDistance) / Math.max(p.slitDistance, 0.01);
  }

  return {
    getFieldAt,
    getScreenPattern,
    getMaxIntensity,
    getFringeSpacing,
    getSources,

    step(dt: number) {
      time += dt;
    },

    getTime(): number {
      return time;
    },

    setParams(newParams: InterferenceParams) {
      p = { ...newParams };
    },

    reset() {
      time = 0;
    },

    getParams() {
      return { ...p };
    },

    /** Wave speed used for animation. */
    waveSpeed: c,
  };
}
