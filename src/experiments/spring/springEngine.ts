import { rk4Step, type DerivFn } from '../../engine/rk4';

export interface SpringParams {
  k: number;       // spring constant 1-50 N/m
  mass: number;    // 0.1-5 kg
  damping: number; // 0-2
}

export interface SpringState {
  x: number;    // displacement from equilibrium
  v: number;    // velocity
  time: number;
}

export function createSpringEngine(params: SpringParams, initialX: number) {
  let state: SpringState = { x: initialX, v: 0, time: 0 };
  let p = { ...params };

  const deriv: DerivFn = (_t, s) => {
    const [x, v] = s;
    const dx = v;
    const dv = -(p.k / p.mass) * x - (p.damping / p.mass) * v;
    return [dx, dv];
  };

  return {
    step(dt: number) {
      const result = rk4Step(deriv, state.time, [state.x, state.v], dt);
      state = { x: result[0], v: result[1], time: state.time + dt };
    },

    getState: (): SpringState => ({ ...state }),

    setParams(newParams: SpringParams) {
      p = { ...newParams };
    },

    reset(x0: number) {
      state = { x: x0, v: 0, time: 0 };
    },

    getEnergy() {
      const kinetic = 0.5 * p.mass * state.v * state.v;
      const potential = 0.5 * p.k * state.x * state.x;
      return { kinetic, potential, total: kinetic + potential };
    },
  };
}
