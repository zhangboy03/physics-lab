import { rk4Step, type DerivFn } from '../../engine/rk4';

export interface PendulumState {
  theta: number;    // angle in radians
  omega: number;    // angular velocity
  time: number;
}

export interface PendulumParams {
  length: number;   // 0.5-3m
  gravity: number;  // 1-20 m/s²
  damping: number;  // 0-1
}

export function createPendulumEngine(params: PendulumParams, initialTheta: number) {
  let state: PendulumState = { theta: initialTheta, omega: 0, time: 0 };
  let p = { ...params };

  const deriv: DerivFn = (_t, s) => {
    const [theta, omega] = s;
    const dTheta = omega;
    const dOmega = -(p.gravity / p.length) * Math.sin(theta) - p.damping * omega;
    return [dTheta, dOmega];
  };

  return {
    step(dt: number) {
      const result = rk4Step(deriv, state.time, [state.theta, state.omega], dt);
      state = { theta: result[0], omega: result[1], time: state.time + dt };
    },
    getState: () => ({ ...state }),
    setParams(newParams: PendulumParams) { p = { ...newParams }; },
    reset(theta0: number) {
      state = { theta: theta0, omega: 0, time: 0 };
    },
    getEnergy() {
      const KE = 0.5 * p.length * p.length * state.omega * state.omega;
      const PE = p.gravity * p.length * (1 - Math.cos(state.theta));
      return { kinetic: KE, potential: PE, total: KE + PE };
    },
  };
}
