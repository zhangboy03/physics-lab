export type DerivFn = (t: number, state: number[]) => number[];

function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

function scale(a: number[], s: number): number[] {
  return a.map(v => v * s);
}

export function rk4Step(f: DerivFn, t: number, state: number[], dt: number): number[] {
  const k1 = f(t, state);
  const k2 = f(t + dt / 2, add(state, scale(k1, dt / 2)));
  const k3 = f(t + dt / 2, add(state, scale(k2, dt / 2)));
  const k4 = f(t + dt, add(state, scale(k3, dt)));
  return add(state, scale(
    add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)),
    dt / 6
  ));
}
