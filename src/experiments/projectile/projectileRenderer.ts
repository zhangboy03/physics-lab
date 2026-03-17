import type { ProjectileState, Trajectory } from './projectileEngine';

const COLORS = {
  ground: '#E5E5EA',
  projectile: '#FF6B35',
  grid: '#F0F0F0',
  text: '#1D1D1F',
  textSecondary: '#8E8E93',
  vxArrow: '#007AFF',   // blue
  vyArrow: '#FF9500',   // orange
  vTotalArrow: '#FF3B30', // red
  cannon: '#636366',
  cannonDark: '#48484A',
  platform: '#AEAEB2',
};

// Trajectory overlay color palette
const TRAJECTORY_COLORS = [
  '#AF52DE', // purple
  '#5AC8FA', // cyan
  '#34C759', // green
  '#FF2D55', // pink
  '#FFCC00', // yellow
  '#5856D6', // indigo
  '#FF9500', // orange
  '#00C7BE', // teal
];

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  padding: { top: number; right: number; bottom: number; left: number };
  scaleX: number; // pixels per meter (horizontal)
  scaleY: number; // pixels per meter (vertical)
  originX: number; // pixel x for world x=0
  originY: number; // pixel y for world y=0 (ground level)
}

function createRenderContext(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  maxRangeX: number,
  maxRangeY: number,
): RenderContext {
  const padding = { top: 30, right: 40, bottom: 40, left: 55 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // Auto-fit: scale to fit both x and y, with some margin
  const rangeX = Math.max(maxRangeX, 1) * 1.15;
  const rangeY = Math.max(maxRangeY, 1) * 1.2;
  const scaleX = plotW / rangeX;
  const scaleY = plotH / rangeY;

  // Use the smaller scale to maintain roughly proportional view,
  // but allow some distortion for better use of canvas space
  const originX = padding.left;
  const originY = h - padding.bottom;

  return { ctx, w, h, padding, scaleX, scaleY, originX, originY };
}

function worldToScreen(rc: RenderContext, wx: number, wy: number): [number, number] {
  return [
    rc.originX + wx * rc.scaleX,
    rc.originY - wy * rc.scaleY,
  ];
}

function drawGrid(rc: RenderContext, maxX: number, maxY: number) {
  const { ctx, padding, w, h } = rc;

  // Determine nice grid intervals
  const niceInterval = (range: number, targetLines: number): number => {
    const rough = range / targetLines;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const residual = rough / mag;
    if (residual <= 1.5) return mag;
    if (residual <= 3.5) return 2 * mag;
    if (residual <= 7.5) return 5 * mag;
    return 10 * mag;
  };

  const intervalX = niceInterval(maxX * 1.15, 6);
  const intervalY = niceInterval(maxY * 1.2, 5);

  ctx.save();

  // Vertical grid lines + x labels
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';

  for (let x = 0; x <= maxX * 1.2; x += intervalX) {
    const [sx] = worldToScreen(rc, x, 0);
    if (sx > w - padding.right + 5) break;
    ctx.beginPath();
    ctx.moveTo(sx, padding.top);
    ctx.lineTo(sx, h - padding.bottom);
    ctx.stroke();
    ctx.fillText(`${Math.round(x * 100) / 100}`, sx, h - padding.bottom + 16);
  }

  // Distance label
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px system-ui';
  ctx.fillText('x (m)', w / 2, h - 4);

  // Horizontal grid lines + y labels
  ctx.strokeStyle = COLORS.grid;
  ctx.textAlign = 'right';
  ctx.font = '11px system-ui';

  for (let y = 0; y <= maxY * 1.3; y += intervalY) {
    const [, sy] = worldToScreen(rc, 0, y);
    if (sy < padding.top - 5) break;
    ctx.beginPath();
    ctx.moveTo(padding.left, sy);
    ctx.lineTo(w - padding.right, sy);
    ctx.stroke();
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(`${Math.round(y * 100) / 100}`, padding.left - 8, sy + 4);
  }

  // Height label (rotated)
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('y (m)', 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawGroundLine(rc: RenderContext) {
  const { ctx, w, padding } = rc;
  const [, groundY] = worldToScreen(rc, 0, 0);

  // Ground fill
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(padding.left, groundY, w - padding.left - padding.right, rc.h - groundY - padding.bottom);

  // Ground line
  ctx.strokeStyle = '#C7C7CC';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, groundY);
  ctx.lineTo(w - padding.right, groundY);
  ctx.stroke();

  // Hatching below ground
  ctx.strokeStyle = '#D1D1D6';
  ctx.lineWidth = 0.8;
  const spacing = 8;
  for (let x = padding.left; x < w - padding.right; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 2);
    ctx.lineTo(x - 6, groundY + 8);
    ctx.stroke();
  }
}

function drawCannon(rc: RenderContext, angleDegs: number, h0: number) {
  const { ctx } = rc;
  const [px, py] = worldToScreen(rc, 0, h0);
  const rad = (angleDegs * Math.PI) / 180;

  const cannonLen = 30;
  const cannonWidth = 10;
  ctx.save();

  // Platform base (if height > 0)
  if (h0 > 0) {
    const [, groundY] = worldToScreen(rc, 0, 0);
    ctx.fillStyle = COLORS.platform;
    ctx.beginPath();
    ctx.moveTo(px - 14, groundY);
    ctx.lineTo(px + 14, groundY);
    ctx.lineTo(px + 10, py + 4);
    ctx.lineTo(px - 10, py + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8E8E93';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cannon barrel
  ctx.translate(px, py);
  ctx.rotate(-rad);

  // Barrel body
  const gradient = ctx.createLinearGradient(0, -cannonWidth / 2, 0, cannonWidth / 2);
  gradient.addColorStop(0, '#8E8E93');
  gradient.addColorStop(0.5, COLORS.cannon);
  gradient.addColorStop(1, COLORS.cannonDark);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(-4, -cannonWidth / 2, cannonLen + 4, cannonWidth, 3);
  ctx.fill();

  // Barrel opening
  ctx.fillStyle = '#2C2C2E';
  ctx.beginPath();
  ctx.ellipse(cannonLen, 0, 3, cannonWidth / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Pivot circle
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.cannonDark;
  ctx.fill();
  ctx.strokeStyle = '#8E8E93';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Angle arc indicator
  ctx.save();
  ctx.strokeStyle = COLORS.textSecondary;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(px, py, 22, 0, -rad, true);
  ctx.stroke();
  ctx.setLineDash([]);

  // Angle label
  const labelRad = rad / 2;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${angleDegs.toFixed(0)}°`,
    px + 26 * Math.cos(labelRad),
    py - 26 * Math.sin(labelRad) + 4,
  );
  ctx.restore();
}

function drawTrajectoryTrail(
  rc: RenderContext,
  trajectory: Trajectory,
  color: string,
  progress: number = 1,
  lineWidth: number = 2.5,
  showFade: boolean = true,
) {
  const { ctx } = rc;
  const { points } = trajectory;
  if (points.length < 2) return;

  const endIdx = Math.max(1, Math.floor((points.length - 1) * progress));

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (showFade && progress < 1) {
    // Draw with fading gradient for active projectile
    for (let i = 1; i <= endIdx; i++) {
      const alpha = 0.15 + 0.85 * (i / endIdx);
      ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      const [x0, y0] = worldToScreen(rc, points[i - 1].x, points[i - 1].y);
      const [x1, y1] = worldToScreen(rc, points[i].x, points[i].y);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  } else {
    // Solid line for completed trajectories
    ctx.strokeStyle = color;
    ctx.globalAlpha = progress < 1 ? 1 : 0.6;
    ctx.beginPath();
    const [sx, sy] = worldToScreen(rc, points[0].x, points[0].y);
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= endIdx; i++) {
      const [px, py] = worldToScreen(rc, points[i].x, points[i].y);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawProjectile(rc: RenderContext, state: ProjectileState) {
  const { ctx } = rc;
  const [sx, sy] = worldToScreen(rc, state.x, state.y);

  // Shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx + 1, sy + 1, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fill();

  // Projectile body
  const gradient = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 8);
  gradient.addColorStop(0, '#FF8F60');
  gradient.addColorStop(1, COLORS.projectile);
  ctx.beginPath();
  ctx.arc(sx, sy, 7, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#E55A1B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(sx - 2, sy - 2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  ctx.restore();
}

function drawVelocityArrows(rc: RenderContext, state: ProjectileState) {
  const { ctx } = rc;
  const [sx, sy] = worldToScreen(rc, state.x, state.y);

  const arrowScale = 1.8; // pixels per m/s
  const headLen = 8;

  const drawArrow = (
    fromX: number,
    fromY: number,
    dx: number,
    dy: number,
    color: string,
    label: string,
    dashed: boolean = false,
  ) => {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(fromX + dx, fromY + dy);
    ctx.stroke();

    // Arrowhead
    ctx.setLineDash([]);
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromX + dx, fromY + dy);
    ctx.lineTo(
      fromX + dx - headLen * Math.cos(angle - Math.PI / 6),
      fromY + dy - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      fromX + dx - headLen * Math.cos(angle + Math.PI / 6),
      fromY + dy - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, fromX + dx * 0.5 + (dy > 0 ? -12 : 12), fromY + dy * 0.5 + (dx > 0 ? -8 : 12));

    ctx.restore();
  };

  const vxPx = state.vx * arrowScale;
  const vyPx = -state.vy * arrowScale; // screen y is flipped

  // Component arrows (dashed)
  drawArrow(sx, sy, vxPx, 0, COLORS.vxArrow, `vx=${state.vx.toFixed(1)}`, true);
  drawArrow(sx + vxPx, sy, 0, vyPx, COLORS.vyArrow, `vy=${state.vy.toFixed(1)}`, true);

  // Total velocity arrow (solid)
  drawArrow(sx, sy, vxPx, vyPx, COLORS.vTotalArrow, `v=${Math.sqrt(state.vx ** 2 + state.vy ** 2).toFixed(1)}`, false);
}

/** Main render function: draws the complete projectile simulation frame */
export function drawProjectileFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: ProjectileState | null,
  activeTrajectory: Trajectory | null,
  historyTrajectories: Trajectory[],
  params: { angle: number; height: number },
  progress: number,
) {
  // Determine global scale from all trajectories
  let globalMaxX = 1;
  let globalMaxY = 1;

  if (activeTrajectory) {
    globalMaxX = Math.max(globalMaxX, activeTrajectory.maxX);
    globalMaxY = Math.max(globalMaxY, activeTrajectory.maxY);
  }
  for (const traj of historyTrajectories) {
    globalMaxX = Math.max(globalMaxX, traj.maxX);
    globalMaxY = Math.max(globalMaxY, traj.maxY);
  }

  const rc = createRenderContext(ctx, w, h, globalMaxX, globalMaxY);

  // Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, w, h);

  // Grid & axes
  drawGrid(rc, globalMaxX, globalMaxY);

  // Ground
  drawGroundLine(rc);

  // History trajectory overlays
  historyTrajectories.forEach((traj, i) => {
    const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
    drawTrajectoryTrail(rc, traj, color, 1, 2, false);

    // Landing point marker for history
    const lastPt = traj.points[traj.points.length - 1];
    const [lx, ly] = worldToScreen(rc, lastPt.x, lastPt.y);
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Range label
    ctx.fillStyle = color;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${lastPt.x.toFixed(1)}m`, lx, ly - 8);
  });

  // Cannon / launcher
  drawCannon(rc, params.angle, params.height);

  // Active trajectory trail
  if (activeTrajectory && state) {
    drawTrajectoryTrail(rc, activeTrajectory, COLORS.projectile, progress, 2.5, true);
  }

  // Active projectile
  if (state && state.active) {
    drawProjectile(rc, state);
    drawVelocityArrows(rc, state);
  } else if (state && !state.active) {
    // Landed: draw at final position without arrows
    drawProjectile(rc, state);

    // Landing info
    const [lx, ly] = worldToScreen(rc, state.x, state.y);
    ctx.fillStyle = COLORS.projectile;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.x.toFixed(1)} m`, lx, ly - 14);
  }

  // Info badge (top-right)
  if (state) {
    const badgeX = w - 12;
    const badgeY = 12;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = '#E5E5EA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX - 150, badgeY, 150, 60, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    const bx = badgeX - 10;
    ctx.fillText(`t = ${state.time.toFixed(2)} s`, bx, badgeY + 18);
    ctx.fillText(`x = ${state.x.toFixed(2)} m`, bx, badgeY + 33);
    ctx.fillText(`y = ${state.y.toFixed(2)} m`, bx, badgeY + 48);
    ctx.restore();
  }
}

/**
 * Compute the launch area bounds for mouse interaction.
 * Returns the pixel region around the cannon where dragging adjusts angle + speed.
 */
export function getLaunchArea(
  w: number,
  h: number,
  maxRangeX: number,
  maxRangeY: number,
  h0: number,
): { cx: number; cy: number; radius: number } {
  const rc = createRenderContext(null as unknown as CanvasRenderingContext2D, w, h, Math.max(maxRangeX, 1), Math.max(maxRangeY, 1));
  const [cx, cy] = worldToScreen(rc, 0, h0);
  return { cx, cy, radius: 120 };
}

/**
 * Convert mouse position (relative to launch point) to angle and speed.
 */
export function mouseToLaunchVector(
  mouseX: number,
  mouseY: number,
  cx: number,
  cy: number,
): { angle: number; v0: number } {
  const dx = mouseX - cx;
  const dy = cy - mouseY; // flip y
  const angle = Math.max(0, Math.min(90, (Math.atan2(dy, Math.max(dx, 1)) * 180) / Math.PI));
  const dist = Math.sqrt(dx * dx + dy * dy);
  const v0 = Math.max(1, Math.min(50, dist / 2.5));
  return { angle: Math.round(angle), v0: Math.round(v0 * 2) / 2 };
}
