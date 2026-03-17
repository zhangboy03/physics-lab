export interface TrailPoint {
  x: number;
  y: number;
}

const ROD_COLOR = '#1D1D1F';
const BOB_COLOR = '#007AFF';
const GRID_COLOR = '#E5E5EA';
const AXIS_LABEL_COLOR = '#8E8E93';
const ARC_COLOR = 'rgba(0, 122, 255, 0.4)';

export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theta: number,
  length: number, // in meters
  trail: TrailPoint[],
) {
  // Clear
  ctx.clearRect(0, 0, w, h);

  // Coordinate system
  const pixelsPerMeter = Math.min(w * 0.35, h * 0.35) / length;
  const cx = w / 2;
  const cyPivot = h * 0.15;
  const L = length * pixelsPerMeter;

  // Bob position
  const bobX = cx + L * Math.sin(theta);
  const bobY = cyPivot + L * Math.cos(theta);

  // --- Background grid ---
  drawGrid(ctx, w, h, pixelsPerMeter, cx, cyPivot);

  // --- Trajectory trail (dashed, fading alpha) ---
  if (trail.length > 1) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.7;
      ctx.strokeStyle = `rgba(0, 122, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Angle arc ---
  if (Math.abs(theta) > 0.02) {
    const arcRadius = Math.min(50, L * 0.3);
    ctx.save();
    ctx.strokeStyle = ARC_COLOR;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 122, 255, 0.08)';

    ctx.beginPath();
    // Arc from vertical (downward) to current angle
    // Canvas: 0 angle is right (+x), vertical down is PI/2
    // theta > 0 means clockwise from vertical (right swing)
    const startAngle = Math.PI / 2; // straight down
    const endAngle = Math.PI / 2 - theta; // pendulum direction
    const counterclockwise = theta > 0;
    ctx.moveTo(cx, cyPivot);
    ctx.arc(cx, cyPivot, arcRadius, startAngle, endAngle, counterclockwise);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Angle label
    const labelAngle = (startAngle + endAngle) / 2;
    const labelR = arcRadius + 14;
    const labelX = cx + labelR * Math.cos(labelAngle);
    const labelY = cyPivot + labelR * Math.sin(labelAngle);
    ctx.fillStyle = BOB_COLOR;
    ctx.font = `12px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const degrees = Math.abs(theta * 180 / Math.PI).toFixed(1);
    ctx.fillText(`${degrees}°`, labelX, labelY);
    ctx.restore();
  }

  // --- Rod ---
  ctx.save();
  ctx.strokeStyle = ROD_COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cyPivot);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.restore();

  // --- Pivot point ---
  ctx.save();
  ctx.fillStyle = ROD_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cyPivot, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Bob (gradient) ---
  ctx.save();
  const bobRadius = 14;
  const gradient = ctx.createRadialGradient(
    bobX - 3, bobY - 3, 2,
    bobX, bobY, bobRadius,
  );
  gradient.addColorStop(0, '#4DA3FF');
  gradient.addColorStop(0.6, BOB_COLOR);
  gradient.addColorStop(1, '#0055CC');
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'rgba(0, 122, 255, 0.35)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pixelsPerMeter: number,
  cx: number,
  cyPivot: number,
) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  // Determine grid spacing: round to nice values in meters
  let gridSpacingM = 0.5;
  const gridSpacingPx = gridSpacingM * pixelsPerMeter;
  if (gridSpacingPx < 30) {
    gridSpacingM = 1;
  }
  const spacing = gridSpacingM * pixelsPerMeter;

  // Vertical lines
  const startX = cx % spacing;
  for (let x = startX; x < w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Horizontal lines
  const startY = cyPivot % spacing;
  for (let y = startY; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = AXIS_LABEL_COLOR;
  ctx.font = `10px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // X-axis labels (distance from center in meters)
  for (let x = startX; x < w; x += spacing) {
    const meters = (x - cx) / pixelsPerMeter;
    if (Math.abs(meters) > 0.01) {
      ctx.fillText(`${meters.toFixed(1)}m`, x, h - 16);
    }
  }

  // Y-axis labels (distance from pivot in meters)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = startY; y < h; y += spacing) {
    const meters = (y - cyPivot) / pixelsPerMeter;
    if (Math.abs(meters) > 0.01) {
      ctx.fillText(`${meters.toFixed(1)}m`, 30, y);
    }
  }

  ctx.restore();
}

/** Compute bob position in canvas pixels (for hit-testing and trail recording). */
export function getBobPosition(
  w: number,
  h: number,
  theta: number,
  length: number,
): { x: number; y: number } {
  const pixelsPerMeter = Math.min(w * 0.35, h * 0.35) / length;
  const cx = w / 2;
  const cyPivot = h * 0.15;
  const L = length * pixelsPerMeter;
  return {
    x: cx + L * Math.sin(theta),
    y: cyPivot + L * Math.cos(theta),
  };
}
