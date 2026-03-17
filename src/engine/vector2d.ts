export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const length = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len > 0 ? scale(v, 1 / len) : { x: 0, y: 0 };
};
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
