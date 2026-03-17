import { useCallback, useEffect, useRef, useState } from 'react';
import ControlPanel from '../../components/ControlPanel';
import type { ParamDef } from '../../experiments/types';
import SimCanvas from '../../components/SimCanvas';
import RealtimeGraph from '../../components/RealtimeGraph';
import EnergyBar from '../../components/EnergyBar';
import FormulaCard from '../../components/FormulaCard';
import { createPendulumEngine, type PendulumParams } from './pendulumEngine';
import { drawPendulum, getBobPosition, type TrailPoint } from './pendulumRenderer';

const paramDefs: ParamDef[] = [
  { key: 'length', label: '摆长 L', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5, unit: 'm' },
  { key: 'gravity', label: '重力 g', min: 1, max: 20, step: 0.5, defaultValue: 9.8, unit: 'm/s²' },
  { key: 'damping', label: '阻尼 b', min: 0, max: 1, step: 0.01, defaultValue: 0.05, unit: '' },
  { key: 'theta0', label: '初始角度 θ₀', min: 5, max: 170, step: 1, defaultValue: 45, unit: '°' },
];

const formulas = [
  String.raw`\ddot{\theta} = -\frac{g}{L}\sin\theta`,
  String.raw`T = 2\pi\sqrt{\frac{L}{g}}`,
  String.raw`E = \frac{1}{2}mL^2\omega^2 + mgL(1-\cos\theta)`,
];

const DT = 1 / 60;
const MAX_TRAIL = 100;
const MAX_GRAPH_POINTS = 500;
const BOB_HIT_RADIUS = 28;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function PendulumSim() {
  // --- Parameter state ---
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const p of paramDefs) {
      defaults[p.key] = p.defaultValue;
    }
    return defaults;
  });

  const [running, setRunning] = useState(true);
  const [energy, setEnergy] = useState({ kinetic: 0, potential: 0, total: 0 });

  // --- Refs ---
  const engineRef = useRef(
    createPendulumEngine(
      { length: 1.5, gravity: 9.8, damping: 0.05 },
      degToRad(45),
    ),
  );
  const trailRef = useRef<TrailPoint[]>([]);
  const animationIdRef = useRef<number>(0);
  const graphDataRef = useRef<{ t: number; v: number }[]>([]);
  const draggingRef = useRef(false);
  const wasRunningBeforeDrag = useRef(true);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  // --- Build engine params from UI values ---
  const getEngineParams = useCallback((): PendulumParams => ({
    length: paramValues.length,
    gravity: paramValues.gravity,
    damping: paramValues.damping,
  }), [paramValues.length, paramValues.gravity, paramValues.damping]);

  // --- Reset simulation ---
  const resetSim = useCallback(() => {
    const engine = engineRef.current;
    engine.setParams(getEngineParams());
    engine.reset(degToRad(paramValues.theta0));
    trailRef.current = [];
    graphDataRef.current = [];
  }, [getEngineParams, paramValues.theta0]);

  // Sync params to engine whenever they change (without full reset)
  useEffect(() => {
    engineRef.current.setParams(getEngineParams());
  }, [getEngineParams]);

  // --- Handle param change ---
  const handleParamChange = useCallback((key: string, value: number) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // --- Handle reset button ---
  const handleReset = useCallback(() => {
    resetSim();
    setRunning(true);
  }, [resetSim]);

  // --- Simulation step (runs via requestAnimationFrame) ---
  useEffect(() => {
    const engine = engineRef.current;

    const tick = () => {
      if (running && !draggingRef.current) {
        engine.step(DT);
      }

      const state = engine.getState();
      const e = engine.getEnergy();
      setEnergy(e);

      // Record graph data
      if (running && !draggingRef.current) {
        const data = graphDataRef.current;
        data.push({ t: state.time, v: radToDeg(state.theta) });
        if (data.length > MAX_GRAPH_POINTS) {
          data.splice(0, data.length - MAX_GRAPH_POINTS);
        }
      }

      animationIdRef.current = requestAnimationFrame(tick);
    };

    animationIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationIdRef.current);
  }, [running]);

  // --- Draw callback for SimCanvas ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    canvasSizeRef.current = { w, h };

    const state = engineRef.current.getState();

    // Update trail
    const bobPos = getBobPosition(w, h, state.theta, paramValues.length);
    const trail = trailRef.current;
    if (running && !draggingRef.current) {
      trail.push(bobPos);
      if (trail.length > MAX_TRAIL) {
        trail.shift();
      }
    }

    drawPendulum(ctx, w, h, state.theta, paramValues.length, trail);
  }, [running, paramValues.length]);

  // --- Mouse drag interaction ---
  const handleCanvasMouseDown = useCallback((mx: number, my: number) => {
    const { w, h } = canvasSizeRef.current;
    const state = engineRef.current.getState();
    const bobPos = getBobPosition(w, h, state.theta, paramValues.length);

    const dx = mx - bobPos.x;
    const dy = my - bobPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BOB_HIT_RADIUS) {
      draggingRef.current = true;
      wasRunningBeforeDrag.current = running;
      setRunning(false);
    }
  }, [running, paramValues.length]);

  const handleCanvasMouseMove = useCallback((mx: number, my: number) => {
    if (!draggingRef.current) return;

    const { w, h } = canvasSizeRef.current;
    const cx = w / 2;
    const cyPivot = h * 0.15;

    // Compute angle from pivot to mouse
    const dx = mx - cx;
    const dy = my - cyPivot;
    const newTheta = Math.atan2(dx, dy);

    // Clamp to reasonable range
    const clampedTheta = Math.max(-Math.PI * 0.95, Math.min(Math.PI * 0.95, newTheta));

    engineRef.current.reset(clampedTheta);
    trailRef.current = [];
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      graphDataRef.current = [];
      setRunning(wasRunningBeforeDrag.current);
    }
  }, []);

  // --- Graph data snapshot for rendering ---
  const [graphSnapshot, setGraphSnapshot] = useState<{ t: number; v: number }[]>([]);
  const [angleSnapshot, setAngleSnapshot] = useState(paramValues.theta0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGraphSnapshot([...graphDataRef.current]);
      setAngleSnapshot(radToDeg(engineRef.current.getState().theta));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const estimatedPeriod = 2 * Math.PI * Math.sqrt(paramValues.length / paramValues.gravity);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[460px] p-0">
            <SimCanvas
              draw={draw}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="lab-panel rounded-[1.4rem] p-5">
              <div className="panel-caption">Observation</div>
              <div className="paper-rule mt-4" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="metric-tile">
                  <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                    当前角度
                  </div>
                  <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                    {angleSnapshot.toFixed(1)}°
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                    小角度周期
                  </div>
                  <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                    {estimatedPeriod.toFixed(2)} s
                  </div>
                </div>
              </div>
            </div>

            <EnergyBar
              kinetic={energy.kinetic}
              potential={energy.potential}
              total={energy.total}
              maxEnergy={energy.total || 1}
            />
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={paramDefs}
            values={paramValues}
            onChange={handleParamChange}
            onReset={handleReset}
            running={running}
            onToggle={() => setRunning(r => !r)}
          >
            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              拖动摆球可以直接改初始位置。阻尼为零时，总机械能应基本守恒。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={graphSnapshot}
        label="角位移 θ"
        unit="°"
        color="#315ca8"
        xLabel="t (s)"
        yRange={[-180, 180]}
      />
    </div>
  );
}

export default PendulumSim;
