// Collision Renderer — Canvas 2D visualisation for 1D collisions

import { type CollisionState, type CollisionParams, massToRadius } from './collisionEngine';

const SURFACE_Y_RATIO = 0.55; // vertical position of the surface (fraction of canvas height)
const BLUE_PRIMARY = '#007AFF';
const BLUE_DARK = '#0055CC';
const BLUE_LIGHT = '#4DA3FF';
const ORANGE_PRIMARY = '#FF9500';
const ORANGE_DARK = '#CC7700';
const ORANGE_LIGHT = '#FFB84D';
const SURFACE_COLOR = '#E5E5EA';
const SURFACE_MARK_COLOR = '#D1D1D6';
const TEXT_SECONDARY = '#8E8E93';
const ARROW_BLUE = '#007AFF';
const ARROW_ORANGE = '#FF9500';

/**
 * Convert simulation metres to canvas pixels.
 * We scale so that the full 16-metre range (-8..+8) fits within 85% of canvas width.
 */
function metresToPixels(w: number): number {
  return (w * 0.85) / 16;
}

export function drawCollision(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: CollisionState,
  params: CollisionParams,
) {
  const scale = metresToPixels(w);
  const cx = w / 2; // canvas centre x
  const surfaceY = h * SURFACE_Y_RATIO;

  ctx.clearRect(0, 0, w, h);

  // --- Background ---
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, w, h);

  // --- Surface line ---
  ctx.save();
  ctx.strokeStyle = SURFACE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, surfaceY);
  ctx.lineTo(w, surfaceY);
  ctx.stroke();

  // Subtle surface marks (friction-like hash marks below surface)
  ctx.strokeStyle = SURFACE_MARK_COLOR;
  ctx.lineWidth = 1;
  const markSpacing = 18;
  for (let x = 0; x < w; x += markSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, surfaceY + 2);
    ctx.lineTo(x - 6, surfaceY + 10);
    ctx.stroke();
  }
  ctx.restore();

  // --- Object radii (pixels) ---
  const r1 = massToRadius(params.m1) * scale;
  const r2 = massToRadius(params.m2) * scale;

  // --- Object positions (pixels) ---
  const px1 = cx + state.x1 * scale;
  const px2 = cx + state.x2 * scale;
  const objY = surfaceY; // bottom of circle sits on surface, centre is above

  const cy1 = objY - r1;
  const cy2 = objY - r2;

  // --- Draw objects ---
  if (state.stuck) {
    // Merged object: draw combined shape
    drawMergedObjects(ctx, px1, px2, cy1, cy2, r1, r2, params);
  } else {
    drawCircleObject(ctx, px1, cy1, r1, BLUE_LIGHT, BLUE_PRIMARY, BLUE_DARK, `m${'\u2081'}`, params.m1);
    drawCircleObject(ctx, px2, cy2, r2, ORANGE_LIGHT, ORANGE_PRIMARY, ORANGE_DARK, `m${'\u2082'}`, params.m2);
  }

  // --- Velocity arrows ---
  if (Math.abs(state.v1) > 0.01) {
    const arrowY1 = cy1 - r1 - 14;
    drawVelocityArrow(ctx, px1, arrowY1, state.v1, scale, ARROW_BLUE);
    // Label
    ctx.save();
    ctx.fillStyle = ARROW_BLUE;
    ctx.font = `bold 11px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${state.v1.toFixed(1)} m/s`, px1, arrowY1 - 6);
    ctx.restore();
  }

  if (!state.stuck && Math.abs(state.v2) > 0.01) {
    const arrowY2 = cy2 - r2 - 14;
    drawVelocityArrow(ctx, px2, arrowY2, state.v2, scale, ARROW_ORANGE);
    ctx.save();
    ctx.fillStyle = ARROW_ORANGE;
    ctx.font = `bold 11px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${state.v2.toFixed(1)} m/s`, px2, arrowY2 - 6);
    ctx.restore();
  }

  // --- Phase label ---
  ctx.save();
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `12px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const phaseLabel = state.phase === 'pre' ? '碰撞前' : '碰撞后';
  const typeLabel = params.type === 'elastic' ? '弹性碰撞' : '完全非弹性碰撞';
  ctx.fillText(`${typeLabel} — ${phaseLabel}`, cx, 12);
  ctx.restore();

  // --- Time label ---
  ctx.save();
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `11px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`t = ${state.time.toFixed(2)}s`, w - 12, 12);
  ctx.restore();
}

// --- Helper: draw a single circle object with gradient ---
function drawCircleObject(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  colorLight: string,
  colorMid: string,
  colorDark: string,
  label: string,
  mass: number,
) {
  ctx.save();

  // Shadow
  ctx.shadowColor = `rgba(0, 0, 0, 0.15)`;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Gradient fill
  const gradient = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.25, r * 0.1,
    cx, cy, r,
  );
  gradient.addColorStop(0, colorLight);
  gradient.addColorStop(0.6, colorMid);
  gradient.addColorStop(1, colorDark);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow for text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Mass label inside
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.max(11, r * 0.45)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy - r * 0.15);

  ctx.font = `${Math.max(9, r * 0.35)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(`${mass.toFixed(1)} kg`, cx, cy + r * 0.25);

  ctx.restore();
}

// --- Helper: draw merged objects (inelastic post-collision) ---
function drawMergedObjects(
  ctx: CanvasRenderingContext2D,
  px1: number,
  px2: number,
  cy1: number,
  cy2: number,
  r1: number,
  r2: number,
  params: CollisionParams,
) {
  const mergedCx = (px1 + px2) / 2;
  const mergedCy = Math.min(cy1, cy2);
  const mergedR = Math.sqrt(r1 * r1 + r2 * r2); // area-preserving radius

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  // Dual-tone gradient: blue on left, orange on right
  const gradient = ctx.createLinearGradient(
    mergedCx - mergedR, mergedCy,
    mergedCx + mergedR, mergedCy,
  );
  gradient.addColorStop(0, BLUE_PRIMARY);
  gradient.addColorStop(0.45, BLUE_LIGHT);
  gradient.addColorStop(0.55, ORANGE_LIGHT);
  gradient.addColorStop(1, ORANGE_PRIMARY);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(mergedCx, mergedCy, mergedR, 0, Math.PI * 2);
  ctx.fill();

  // Dashed border to indicate merged state
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.max(11, mergedR * 0.35)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${(params.m1 + params.m2).toFixed(1)} kg`, mergedCx, mergedCy);

  ctx.restore();
}

// --- Helper: draw a velocity arrow ---
function drawVelocityArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  velocity: number,
  scale: number,
  color: string,
) {
  const arrowLen = Math.abs(velocity) * scale * 0.3; // scale arrow visually
  const dir = Math.sign(velocity);
  const headSize = 6;

  if (arrowLen < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  const x1 = x;
  const x2 = x + dir * arrowLen;

  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - dir * headSize, y - headSize * 0.6);
  ctx.lineTo(x2 - dir * headSize, y + headSize * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
