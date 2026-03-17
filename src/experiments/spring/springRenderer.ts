const WALL_COLOR = '#1D1D1F';
const SPRING_COLOR = '#636366';
const MASS_COLOR_PRIMARY = '#007AFF';
const MASS_COLOR_HIGHLIGHT = '#4DA3FF';
const MASS_COLOR_SHADOW = '#0055CC';
const FLOOR_COLOR = '#C7C7CC';
const EQUILIBRIUM_COLOR = 'rgba(0, 122, 255, 0.4)';
const DISPLACEMENT_ARROW_COLOR = '#FF6B35';
const HATCH_COLOR = '#B0B0B5';
const BG_COLOR = '#FAFAFA';

/**
 * Draw the spring oscillator scene:
 *   wall | zigzag spring | mass block  on a flat surface
 *
 * @param x            displacement from equilibrium (positive = right)
 * @param springLength  natural (rest) length of the spring in meters
 */
export function drawSpring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  springLength: number,
) {
  // Clear
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  // Layout constants (in CSS pixels)
  const wallWidth = 18;
  const wallLeft = w * 0.06;
  const floorY = h * 0.62;
  const massW = 48;
  const massH = 40;
  const massRadius = 6;

  // Pixel scale: natural spring length maps to a fraction of the canvas
  const availableWidth = w * 0.65;
  const pixelsPerMeter = availableWidth / springLength;

  // Anchor point: right edge of wall
  const anchorX = wallLeft + wallWidth;
  const springY = floorY - massH / 2; // spring connects at vertical center of mass

  // Equilibrium position: right end of natural spring
  const eqX = anchorX + springLength * pixelsPerMeter;

  // Current mass-block left edge
  const massLeft = eqX + x * pixelsPerMeter;

  // Spring endpoint: left edge of mass block
  const springEndX = massLeft;

  // --- Floor / surface ---
  drawFloor(ctx, w, h, floorY);

  // --- Wall ---
  drawWall(ctx, wallLeft, 0, wallWidth, floorY);

  // --- Equilibrium dashed line ---
  ctx.save();
  ctx.strokeStyle = EQUILIBRIUM_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(eqX + massW / 2, floorY - massH - 14);
  ctx.lineTo(eqX + massW / 2, floorY + 4);
  ctx.stroke();
  ctx.setLineDash([]);
  // Label
  ctx.fillStyle = EQUILIBRIUM_COLOR;
  ctx.font = `11px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x = 0', eqX + massW / 2, floorY - massH - 16);
  ctx.restore();

  // --- Zigzag spring ---
  drawZigzagSpring(ctx, anchorX, springY, springEndX);

  // --- Mass block ---
  drawMassBlock(ctx, massLeft, floorY - massH, massW, massH, massRadius);

  // --- Displacement arrow ---
  if (Math.abs(x) > 0.03) {
    drawDisplacementArrow(ctx, eqX + massW / 2, massLeft + massW / 2, floorY + 22, x);
  }
}

/** Compute the mass block center in canvas pixels (for hit-testing). */
export function getMassPosition(
  w: number,
  h: number,
  x: number,
  springLength: number,
): { cx: number; cy: number; hw: number; hh: number } {
  const wallWidth = 18;
  const wallLeft = w * 0.06;
  const floorY = h * 0.62;
  const massW = 48;
  const massH = 40;

  const availableWidth = w * 0.65;
  const pixelsPerMeter = availableWidth / springLength;

  const anchorX = wallLeft + wallWidth;
  const eqX = anchorX + springLength * pixelsPerMeter;
  const massLeft = eqX + x * pixelsPerMeter;

  return {
    cx: massLeft + massW / 2,
    cy: floorY - massH / 2,
    hw: massW / 2,
    hh: massH / 2,
  };
}

// ─── Internal drawing helpers ───────────────────────────────────────────

function drawFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  floorY: number,
) {
  ctx.save();

  // Main floor line
  ctx.strokeStyle = FLOOR_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();

  // Hatching below floor
  ctx.strokeStyle = HATCH_COLOR;
  ctx.lineWidth = 1;
  const hatchSpacing = 10;
  const hatchLen = 12;
  for (let lx = 0; lx < w; lx += hatchSpacing) {
    ctx.beginPath();
    ctx.moveTo(lx, floorY);
    ctx.lineTo(lx - hatchLen * 0.5, floorY + hatchLen);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  wallW: number,
  wallH: number,
) {
  ctx.save();

  // Filled wall rectangle
  ctx.fillStyle = '#D1D1D6';
  ctx.fillRect(lx, ly, wallW, wallH);

  // Border
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(lx, ly, wallW, wallH);

  // Cross-hatching
  ctx.strokeStyle = HATCH_COLOR;
  ctx.lineWidth = 1;
  const spacing = 8;
  // Diagonal lines (top-left to bottom-right)
  for (let d = -wallH; d < wallW + wallH; d += spacing) {
    ctx.beginPath();
    const x0 = lx + d;
    const y0 = ly;
    const x1 = lx + d - wallH;
    const y1 = ly + wallH;
    ctx.moveTo(Math.max(lx, Math.min(lx + wallW, x0)), Math.max(ly, y0 + Math.max(0, lx - x0)));
    ctx.lineTo(Math.max(lx, Math.min(lx + wallW, x1)), Math.min(ly + wallH, y1 - Math.max(0, lx - x1)));
    ctx.stroke();
  }

  // Right edge (spring attachment face)
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(lx + wallW, ly);
  ctx.lineTo(lx + wallW, wallH);
  ctx.stroke();

  ctx.restore();
}

function drawZigzagSpring(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
) {
  const coils = 12;
  const amplitude = 10;

  // Straight leader segments
  const leaderLen = 8;

  ctx.save();
  ctx.strokeStyle = SPRING_COLOR;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();

  // Left leader
  ctx.moveTo(x0, y0);
  const zigStart = x0 + leaderLen;
  ctx.lineTo(zigStart, y0);

  // Zigzag section
  const zigEnd = x1 - leaderLen;
  const zigLen = zigEnd - zigStart;

  if (zigLen > 0) {
    const segLen = zigLen / (coils * 2);
    for (let i = 0; i < coils * 2; i++) {
      const px = zigStart + segLen * (i + 1);
      const py = y0 + (i % 2 === 0 ? -amplitude : amplitude);
      ctx.lineTo(px, py);
    }
  }

  // Right leader
  ctx.lineTo(x1, y0);
  ctx.stroke();

  ctx.restore();
}

function drawMassBlock(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  bw: number,
  bh: number,
  r: number,
) {
  ctx.save();

  // Shadow
  ctx.shadowColor = 'rgba(0, 122, 255, 0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  // Rounded rectangle path
  ctx.beginPath();
  ctx.moveTo(lx + r, ly);
  ctx.lineTo(lx + bw - r, ly);
  ctx.quadraticCurveTo(lx + bw, ly, lx + bw, ly + r);
  ctx.lineTo(lx + bw, ly + bh - r);
  ctx.quadraticCurveTo(lx + bw, ly + bh, lx + bw - r, ly + bh);
  ctx.lineTo(lx + r, ly + bh);
  ctx.quadraticCurveTo(lx, ly + bh, lx, ly + bh - r);
  ctx.lineTo(lx, ly + r);
  ctx.quadraticCurveTo(lx, ly, lx + r, ly);
  ctx.closePath();

  // Gradient fill
  const gradient = ctx.createLinearGradient(lx, ly, lx, ly + bh);
  gradient.addColorStop(0, MASS_COLOR_HIGHLIGHT);
  gradient.addColorStop(0.5, MASS_COLOR_PRIMARY);
  gradient.addColorStop(1, MASS_COLOR_SHADOW);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Reset shadow before stroke
  ctx.shadowColor = 'transparent';

  // Border
  ctx.strokeStyle = MASS_COLOR_SHADOW;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label "m"
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold 14px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('m', lx + bw / 2, ly + bh / 2);

  ctx.restore();
}

function drawDisplacementArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  toX: number,
  y: number,
  x: number,
) {
  ctx.save();
  ctx.strokeStyle = DISPLACEMENT_ARROW_COLOR;
  ctx.fillStyle = DISPLACEMENT_ARROW_COLOR;
  ctx.lineWidth = 2;

  // Shaft
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  ctx.lineTo(toX, y);
  ctx.stroke();

  // Arrowhead
  const arrowLen = 8;
  const arrowW = 4;
  const dir = x > 0 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(toX, y);
  ctx.lineTo(toX - dir * arrowLen, y - arrowW);
  ctx.lineTo(toX - dir * arrowLen, y + arrowW);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.font = `11px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`x = ${x.toFixed(2)} m`, (fromX + toX) / 2, y + 6);

  ctx.restore();
}
