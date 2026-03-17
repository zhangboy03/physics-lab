export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  active: boolean;
}

export interface ProjectileParams {
  v0: number;      // initial speed 1-50 m/s
  angle: number;   // launch angle 0-90 degrees
  gravity: number; // 1-20 m/s²
  height: number;  // initial height 0-20 m
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export interface Trajectory {
  points: TrajectoryPoint[];
  params: ProjectileParams;
  maxX: number;
  maxY: number;
  totalTime: number;
}

/**
 * Compute the full trajectory analytically (no air resistance).
 * Parametric equations:
 *   x(t) = v0 * cos(angle) * t
 *   y(t) = h0 + v0 * sin(angle) * t - 0.5 * g * t^2
 *
 * The projectile lands when y(t) <= 0.
 */
export function computeTrajectory(params: ProjectileParams, dt = 0.01): Trajectory {
  const { v0, angle, gravity, height } = params;
  const rad = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);

  // Analytical time of flight: solve h0 + vy*t - 0.5*g*t^2 = 0
  // t = (vy + sqrt(vy^2 + 2*g*h0)) / g
  const discriminant = vy * vy + 2 * gravity * height;
  const totalTime = discriminant >= 0
    ? (vy + Math.sqrt(discriminant)) / gravity
    : 0;

  const points: TrajectoryPoint[] = [];
  let maxX = 0;
  let maxY = 0;

  for (let t = 0; t <= totalTime; t += dt) {
    const x = vx * t;
    const y = height + vy * t - 0.5 * gravity * t * t;
    points.push({ x, y: Math.max(y, 0), t });
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  // Add the exact landing point
  const xFinal = vx * totalTime;
  const yFinal = 0;
  points.push({ x: xFinal, y: yFinal, t: totalTime });
  if (xFinal > maxX) maxX = xFinal;

  return { points, params: { ...params }, maxX, maxY, totalTime };
}

export function createProjectileEngine(params: ProjectileParams) {
  const rad = (params.angle * Math.PI) / 180;
  const vx0 = params.v0 * Math.cos(rad);
  const vy0 = params.v0 * Math.sin(rad);

  let state: ProjectileState = {
    x: 0,
    y: params.height,
    vx: vx0,
    vy: vy0,
    time: 0,
    active: true,
  };

  // Pre-compute the full trajectory for trail drawing
  const trajectory = computeTrajectory(params);

  return {
    step(dt: number) {
      if (!state.active) return;

      const t = state.time + dt;
      const x = vx0 * t;
      const y = params.height + vy0 * t - 0.5 * params.gravity * t * t;
      const vy = vy0 - params.gravity * t;

      if (y <= 0) {
        // Land exactly at y = 0
        state = {
          x: vx0 * trajectory.totalTime,
          y: 0,
          vx: vx0,
          vy: vy0 - params.gravity * trajectory.totalTime,
          time: trajectory.totalTime,
          active: false,
        };
      } else {
        state = { x, y, vx: vx0, vy, time: t, active: true };
      }
    },

    getState: (): ProjectileState => ({ ...state }),

    getTrajectory: (): Trajectory => trajectory,

    /** Get the analytical range (flat ground from h=0): R = v0^2 * sin(2a) / g */
    getRange(): number {
      // General range including initial height:
      return trajectory.maxX;
    },

    /** Max height above ground */
    getMaxHeight(): number {
      return trajectory.maxY;
    },

    /** Get the fraction of progress through the trajectory (0 to 1) */
    getProgress(): number {
      if (trajectory.totalTime <= 0) return 1;
      return Math.min(state.time / trajectory.totalTime, 1);
    },

    reset() {
      state = {
        x: 0,
        y: params.height,
        vx: vx0,
        vy: vy0,
        time: 0,
        active: true,
      };
    },
  };
}
