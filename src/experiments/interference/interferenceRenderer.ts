import type { InterferenceParams, ScreenPoint } from './interferenceEngine';

// ── Color palette ──────────────────────────────────────────────
const BG_COLOR = '#0A0A1A';
const SCREEN_BG = '#111128';
const LABEL_COLOR = '#8E8E93';
const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
const BARRIER_COLOR = '#2A2A4A';

// ── Layout constants ───────────────────────────────────────────
const FIELD_LEFT_FRAC = 0.05;    // wave field starts at 5% from left
const SCREEN_RIGHT_FRAC = 0.88;  // screen at 88% from left
const SCREEN_DRAW_WIDTH = 40;    // pixel width of the intensity bar

/**
 * Map a wave amplitude value in [-maxAmp, +maxAmp] to an RGBA color string.
 * Positive -> blue-white, Negative -> red-dark, Zero -> near-black.
 */
function amplitudeToColor(value: number, maxAmp: number): string {
  const norm = Math.max(-1, Math.min(1, value / (maxAmp || 1)));
  const abs = Math.abs(norm);

  if (norm >= 0) {
    // Positive: dark blue -> bright cyan-white
    const r = Math.round(30 + 225 * abs * abs);
    const g = Math.round(60 + 195 * abs);
    const b = Math.round(120 + 135 * abs);
    return `rgba(${r},${g},${b},${0.15 + 0.85 * abs})`;
  } else {
    // Negative: dark red -> bright magenta
    const r = Math.round(120 + 135 * abs);
    const g = Math.round(20 + 30 * abs);
    const b = Math.round(60 + 80 * abs);
    return `rgba(${r},${g},${b},${0.15 + 0.85 * abs})`;
  }
}

/**
 * Map normalized intensity [0..1] to a color for the detection screen.
 * 0 -> dark, 1 -> bright golden-white.
 */
function intensityToScreenColor(normI: number): string {
  const t = Math.max(0, Math.min(1, normI));
  const t2 = t * t; // non-linear for more dramatic contrast

  const r = Math.round(20 + 235 * t2);
  const g = Math.round(15 + 220 * t2 * 0.9);
  const b = Math.round(10 + 120 * t2 * 0.5);
  return `rgb(${r},${g},${b})`;
}

/**
 * Draw the complete double-slit interference visualization.
 *
 * Layout (left to right):
 *   1. Slit barrier with two point sources
 *   2. 2D wave field heatmap showing interference pattern
 *   3. Detection screen with intensity bands
 */
export function drawInterference(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: InterferenceParams,
  time: number,
  getFieldAt: (x: number, y: number, t: number) => number,
  screenPattern: ScreenPoint[],
) {
  // ── Background ─────────────────────────────────────────────
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  // ── Coordinate mapping ─────────────────────────────────────
  // Physics x: 0 (slits) .. L (screen)
  // Physics y: centered, spans enough to cover screen pattern
  const L = params.screenDistance;
  const halfD = params.slitDistance / 2;

  // Screen pattern span
  const fringeSpacing = params.wavelength * L / Math.max(params.slitDistance, 0.01);
  const physYSpan = Math.max(fringeSpacing * 6, 5);

  const fieldLeft = w * FIELD_LEFT_FRAC;
  const fieldRight = w * SCREEN_RIGHT_FRAC;
  const fieldW = fieldRight - fieldLeft;

  const midY = h / 2;
  const pixPerUnitX = fieldW / L;
  const pixPerUnitY = (h * 0.9) / (2 * physYSpan);

  const toPixX = (physX: number) => fieldLeft + physX * pixPerUnitX;
  const toPixY = (physY: number) => midY - physY * pixPerUnitY;

  // ── Subtle grid ────────────────────────────────────────────
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  const gridSpacingX = Math.max(1, Math.ceil(L / 10));
  for (let gx = 0; gx <= L; gx += gridSpacingX) {
    const px = toPixX(gx);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }
  const gridSpacingY = Math.max(1, Math.ceil(physYSpan / 5));
  for (let gy = -physYSpan; gy <= physYSpan; gy += gridSpacingY) {
    const py = toPixY(gy);
    ctx.beginPath();
    ctx.moveTo(fieldLeft, py);
    ctx.lineTo(fieldRight, py);
    ctx.stroke();
  }

  // ── 2D wave field heatmap ──────────────────────────────────
  // Sample the field on a grid and draw colored rectangles.
  // Resolution adapts to canvas size for performance.
  const heatCellSize = Math.max(3, Math.min(6, Math.floor(w / 180)));
  const numCellsX = Math.ceil(fieldW / heatCellSize);
  const numCellsY = Math.ceil(h / heatCellSize);

  // Pre-compute max amplitude for color normalization
  // Two sources, each with amplitude A and decay ~ 1/sqrt(r), at moderate distance
  const maxAmp = params.amplitude * 2 * (1 / Math.sqrt(Math.max(L * 0.3, 0.5)));

  for (let ci = 0; ci < numCellsX; ci++) {
    const px = fieldLeft + ci * heatCellSize;
    const physX = (ci / numCellsX) * L;
    if (physX < 0.1) continue; // skip too close to slits

    for (let cj = 0; cj < numCellsY; cj++) {
      const py = cj * heatCellSize;
      const physY = -(py - midY) / pixPerUnitY;

      const val = getFieldAt(physX, physY, time);
      ctx.fillStyle = amplitudeToColor(val, maxAmp);
      ctx.fillRect(px, py, heatCellSize + 0.5, heatCellSize + 0.5);
    }
  }

  // ── Slit barrier ───────────────────────────────────────────
  const barrierX = toPixX(0);
  const barrierW = 4;
  const slitGapPx = 6; // visual gap for each slit

  // Draw barrier with gaps at slit positions
  const slit1Y = toPixY(halfD);
  const slit2Y = toPixY(-halfD);

  ctx.fillStyle = BARRIER_COLOR;
  // Top segment
  ctx.fillRect(barrierX - barrierW / 2, 0, barrierW, Math.max(0, slit1Y - slitGapPx));
  // Middle segment (between slits)
  ctx.fillRect(barrierX - barrierW / 2, slit1Y + slitGapPx, barrierW,
    Math.max(0, slit2Y - slitGapPx - slit1Y - slitGapPx));
  // Bottom segment
  ctx.fillRect(barrierX - barrierW / 2, slit2Y + slitGapPx, barrierW,
    h - slit2Y - slitGapPx);

  // ── Slit point sources (glowing dots) ──────────────────────
  for (const slitY of [slit1Y, slit2Y]) {
    // Outer glow
    const glow = ctx.createRadialGradient(barrierX, slitY, 0, barrierX, slitY, 14);
    glow.addColorStop(0, 'rgba(100, 180, 255, 0.8)');
    glow.addColorStop(0.5, 'rgba(100, 180, 255, 0.2)');
    glow.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(barrierX - 14, slitY - 14, 28, 28);

    // Core dot
    ctx.fillStyle = '#B0D4FF';
    ctx.beginPath();
    ctx.arc(barrierX, slitY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Animated wavefront rings ───────────────────────────────
  // Draw expanding circles from each source to show wave propagation.
  const k = (2 * Math.PI) / params.wavelength;
  const omega = (2 * Math.PI * 3.0) / params.wavelength; // c = 3.0
  const wavefrontRadius = (omega * time) / k; // how far wavefronts have traveled

  ctx.save();
  // Clip to field area
  ctx.beginPath();
  ctx.rect(fieldLeft, 0, fieldW + 2, h);
  ctx.clip();

  for (const [sx, sy] of [[0, halfD], [0, -halfD]]) {
    const cx = toPixX(sx);
    const cy = toPixY(sy);
    // Draw wavefront circles at r = n * lambda
    const maxR = Math.max(L * 1.5, wavefrontRadius);
    for (let n = 1; n * params.wavelength <= maxR; n++) {
      const r = n * params.wavelength;
      const rPx = r * pixPerUnitX;

      // Only draw wavefronts that have "reached" this distance
      if (r > wavefrontRadius) break;

      // Fade out distant wavefronts
      const distFade = Math.max(0, 1 - r / (L * 1.2));
      // Phase of this wavefront ring
      const phase = Math.sin(omega * time - k * r);
      const alpha = distFade * 0.25 * Math.abs(phase);

      if (alpha < 0.01) continue;

      ctx.strokeStyle = phase >= 0
        ? `rgba(80, 160, 255, ${alpha})`
        : `rgba(255, 80, 120, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── Constructive / destructive path lines ──────────────────
  // Draw dotted lines from slits to specific points on the screen
  // to illustrate path difference.
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 0.8;

  // Show paths for central maximum and first two orders
  const screenX = toPixX(L);
  for (let n = 0; n <= 2; n++) {
    // Constructive: d*sinTheta = n*lambda => y = n*lambda*L/d
    const yConst = n * fringeSpacing;
    if (yConst > physYSpan) break;

    for (const sign of [1, -1]) {
      if (n === 0 && sign === -1) continue; // only one central max
      const screenPy = toPixY(sign * yConst);

      // Lines from each slit to this screen point
      ctx.strokeStyle = `rgba(255, 220, 80, ${0.25 - n * 0.05})`;
      for (const [, sy] of [[0, halfD], [0, -halfD]]) {
        const slitPy = toPixY(sy);
        ctx.beginPath();
        ctx.moveTo(barrierX, slitPy);
        ctx.lineTo(screenX, screenPy);
        ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── Detection screen ───────────────────────────────────────
  if (screenPattern.length > 0) {
    const screenXStart = fieldRight + 4;
    const screenDrawW = SCREEN_DRAW_WIDTH;

    // Find max intensity for normalization
    let maxI = 0;
    for (const sp of screenPattern) {
      if (sp.intensity > maxI) maxI = sp.intensity;
    }
    if (maxI === 0) maxI = 1;

    // Background
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(screenXStart, 0, screenDrawW, h);

    // Draw intensity bands
    const numBands = screenPattern.length;
    for (let i = 0; i < numBands; i++) {
      const sp = screenPattern[i];
      const py = toPixY(sp.y);
      const normI = sp.intensity / maxI;

      // Height of each band
      const bandH = h / numBands + 1;

      ctx.fillStyle = intensityToScreenColor(normI);
      ctx.fillRect(screenXStart, py - bandH / 2, screenDrawW, bandH);

      // Extra glow for bright fringes
      if (normI > 0.7) {
        const glowAlpha = (normI - 0.7) * 2;
        ctx.fillStyle = `rgba(255, 255, 200, ${glowAlpha * 0.15})`;
        ctx.fillRect(screenXStart - 8, py - bandH / 2, screenDrawW + 16, bandH);
      }
    }

    // Screen edge line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenXStart, 0);
    ctx.lineTo(screenXStart, h);
    ctx.stroke();

    // "Screen" label
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(screenXStart + screenDrawW + 14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Detection Screen', 0, 0);
    ctx.restore();
  }

  // ── Labels ─────────────────────────────────────────────────
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';

  // Slit distance label
  const labelX = barrierX + 12;
  const labelY1 = toPixY(halfD);
  const labelY2 = toPixY(-halfD);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(barrierX + 8, labelY1);
  ctx.lineTo(barrierX + 8, labelY2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`d = ${params.slitDistance.toFixed(1)}`, labelX + 4, (labelY1 + labelY2) / 2 + 4);

  // Screen distance label
  ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`L = ${params.screenDistance.toFixed(0)}`, (barrierX + fieldRight) / 2, h - 8);

  // Wavelength label
  ctx.fillText(`\u03BB = ${params.wavelength.toFixed(1)}`, fieldLeft + 40, 16);

  // Fringe spacing label
  ctx.fillStyle = 'rgba(255, 220, 80, 0.6)';
  ctx.fillText(`\u0394x = ${fringeSpacing.toFixed(2)}`, fieldRight - 60, 16);

  // Title
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Double-Slit Interference', fieldLeft, 16);
}
