// 1D Collision Engine — elastic & perfectly inelastic on a frictionless surface

export interface CollisionParams {
  m1: number; // 0.5–5 kg
  m2: number; // 0.5–5 kg
  v1: number; // -10 to 10 m/s (initial velocity of object 1)
  v2: number; // -10 to 10 m/s (initial velocity of object 2)
  type: 'elastic' | 'inelastic';
}

export interface CollisionState {
  x1: number; // position of object 1 centre (metres)
  x2: number; // position of object 2 centre (metres)
  v1: number; // velocity of object 1
  v2: number; // velocity of object 2
  time: number;
  phase: 'pre' | 'post';
  stuck: boolean; // true after inelastic collision (objects merged)
}

export interface MomentumInfo {
  before: number; // total momentum before collision
  after: number; // total momentum after collision
  p1Before: number;
  p2Before: number;
  p1After: number;
  p2After: number;
}

export interface KEInfo {
  before: number; // total KE before
  after: number; // total KE after
  loss: number; // energy lost (>= 0)
  ke1Before: number;
  ke2Before: number;
  ke1After: number;
  ke2After: number;
}

/** Compute the radius (in metres) of an object given its mass. */
export function massToRadius(mass: number): number {
  return 0.3 + mass * 0.16; // metres — maps 0.5 kg → 0.38 m, 5 kg → 1.1 m
}

export function createCollisionEngine(params: CollisionParams) {
  let p = { ...params };

  // Derive radii
  const r1 = () => massToRadius(p.m1);
  const r2 = () => massToRadius(p.m2);

  // Initial separation: place objects so they have room to approach
  const INITIAL_GAP = 6; // metres between surfaces
  const startX1 = () => -(INITIAL_GAP / 2) - r1();
  const startX2 = () => INITIAL_GAP / 2 + r2();

  // Post-collision velocities (computed once at moment of contact)
  let v1Post = 0;
  let v2Post = 0;

  let state: CollisionState = {
    x1: startX1(),
    x2: startX2(),
    v1: p.v1,
    v2: p.v2,
    time: 0,
    phase: 'pre',
    stuck: false,
  };

  function computePostVelocities() {
    const { m1, m2, type } = p;
    const v1i = p.v1;
    const v2i = p.v2;

    if (type === 'elastic') {
      // Elastic: conserve momentum + KE
      v1Post = ((m1 - m2) * v1i + 2 * m2 * v2i) / (m1 + m2);
      v2Post = ((m2 - m1) * v2i + 2 * m1 * v1i) / (m1 + m2);
    } else {
      // Perfectly inelastic: objects stick together
      const vf = (m1 * v1i + m2 * v2i) / (m1 + m2);
      v1Post = vf;
      v2Post = vf;
    }
  }

  function checkCollision(): boolean {
    const dist = state.x2 - state.x1;
    return dist <= r1() + r2();
  }

  return {
    step(dt: number) {
      state.time += dt;

      if (state.phase === 'pre') {
        // Move objects toward each other
        state.x1 += state.v1 * dt;
        state.x2 += state.v2 * dt;

        // Check if they collide
        if (checkCollision()) {
          // Snap to touching
          const contactPoint = (state.x1 * r2() + state.x2 * r1()) / (r1() + r2());
          state.x1 = contactPoint - r1();
          state.x2 = contactPoint + r2();

          computePostVelocities();
          state.phase = 'post';
          state.v1 = v1Post;
          state.v2 = v2Post;
          state.stuck = p.type === 'inelastic';
        }
      } else {
        // Post-collision: objects separate (or move together if stuck)
        state.x1 += state.v1 * dt;
        state.x2 += state.v2 * dt;

        // If stuck, keep them glued
        if (state.stuck) {
          const cx = (state.x1 * p.m2 + state.x2 * p.m1) / (p.m1 + p.m2);
          const combined = r1() + r2();
          state.x1 = cx - combined / 2;
          state.x2 = cx + combined / 2;
          // Both velocities are equal for inelastic
          state.v1 = v1Post;
          state.v2 = v2Post;
        }
      }
    },

    getState(): CollisionState {
      return { ...state };
    },

    getParams(): CollisionParams {
      return { ...p };
    },

    reset() {
      state = {
        x1: startX1(),
        x2: startX2(),
        v1: p.v1,
        v2: p.v2,
        time: 0,
        phase: 'pre',
        stuck: false,
      };
      v1Post = 0;
      v2Post = 0;
    },

    setParams(newParams: CollisionParams) {
      p = { ...newParams };
    },

    getMomentum(): MomentumInfo {
      const p1Before = p.m1 * p.v1;
      const p2Before = p.m2 * p.v2;
      const before = p1Before + p2Before;

      // Post-collision momenta (recompute to be accurate even if not yet collided)
      computePostVelocities();
      const p1After = p.m1 * v1Post;
      const p2After = p.m2 * v2Post;
      const after = p1After + p2After;

      return { before, after, p1Before, p2Before, p1After, p2After };
    },

    getKE(): KEInfo {
      const ke1Before = 0.5 * p.m1 * p.v1 * p.v1;
      const ke2Before = 0.5 * p.m2 * p.v2 * p.v2;
      const before = ke1Before + ke2Before;

      computePostVelocities();
      const ke1After = 0.5 * p.m1 * v1Post * v1Post;
      const ke2After = 0.5 * p.m2 * v2Post * v2Post;
      const after = ke1After + ke2After;

      return {
        before,
        after,
        loss: before - after,
        ke1Before,
        ke2Before,
        ke1After,
        ke2After,
      };
    },

    /** Whether the two objects will actually collide given their velocities. */
    willCollide(): boolean {
      // They collide if the relative approach velocity is negative (closing gap)
      return p.v1 - p.v2 > 0 || state.x1 > state.x2;
    },
  };
}
