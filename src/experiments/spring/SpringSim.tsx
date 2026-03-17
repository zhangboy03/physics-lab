import { useCallback, useEffect, useRef, useState } from 'react';
import ControlPanel from '../../components/ControlPanel';
import type { ParamDef } from '../../experiments/types';
import SimCanvas from '../../components/SimCanvas';
import RealtimeGraph from '../../components/RealtimeGraph';
import EnergyBar from '../../components/EnergyBar';
import FormulaCard from '../../components/FormulaCard';
import { createSpringEngine, type SpringParams } from './springEngine';
import { drawSpring, getMassPosition } from './springRenderer';

const paramDefs: ParamDef[] = [
  { key: 'k', label: '弹簧常数 k', min: 1, max: 50, step: 0.5, defaultValue: 10, unit: 'N/m' },
  { key: 'mass', label: '质量 m', min: 0.1, max: 5, step: 0.1, defaultValue: 1, unit: 'kg' },
  { key: 'damping', label: '阻尼 b', min: 0, max: 2, step: 0.05, defaultValue: 0.1, unit: '' },
  { key: 'x0', label: '初始位移 x\u2080', min: -2, max: 2, step: 0.1, defaultValue: 1, unit: 'm' },
];

const formulas = [
  String.raw`F = -kx`,
  String.raw`x(t) = A\cos(\omega t + \varphi)`,
  String.raw`\omega = \sqrt{\frac{k}{m}}`,
  String.raw`T = 2\pi\sqrt{\frac{m}{k}}`,
];

const DT = 1 / 60;
const MAX_GRAPH_POINTS = 500;
const NATURAL_SPRING_LENGTH = 2; // visual rest length in meters
const MASS_HIT_PADDING = 16;     // extra pixels around mass for easier clicking

function SpringSim() {
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
    createSpringEngine(
      { k: 10, mass: 1, damping: 0.1 },
      1, // initial displacement
    ),
  );
  const animationIdRef = useRef<number>(0);
  const graphDataRef = useRef<{ t: number; v: number }[]>([]);
  const draggingRef = useRef(false);
  const wasRunningBeforeDrag = useRef(true);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  // --- Build engine params from UI values ---
  const getEngineParams = useCallback((): SpringParams => ({
    k: paramValues.k,
    mass: paramValues.mass,
    damping: paramValues.damping,
  }), [paramValues.k, paramValues.mass, paramValues.damping]);

  // --- Reset simulation ---
  const resetSim = useCallback(() => {
    const engine = engineRef.current;
    engine.setParams(getEngineParams());
    engine.reset(paramValues.x0);
    graphDataRef.current = [];
  }, [getEngineParams, paramValues.x0]);

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

  // --- Simulation step ---
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
        data.push({ t: state.time, v: state.x });
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
    drawSpring(ctx, w, h, state.x, NATURAL_SPRING_LENGTH);
  }, []);

  // --- Mouse drag interaction ---
  const handleCanvasMouseDown = useCallback((mx: number, my: number) => {
    const { w, h } = canvasSizeRef.current;
    const state = engineRef.current.getState();
    const massPos = getMassPosition(w, h, state.x, NATURAL_SPRING_LENGTH);

    const dx = Math.abs(mx - massPos.cx);
    const dy = Math.abs(my - massPos.cy);
    const pad = MASS_HIT_PADDING;

    if (dx < massPos.hw + pad && dy < massPos.hh + pad) {
      draggingRef.current = true;
      wasRunningBeforeDrag.current = running;
      setRunning(false);
    }
  }, [running]);

  const handleCanvasMouseMove = useCallback((mx: number) => {
    if (!draggingRef.current) return;

    const { w } = canvasSizeRef.current;

    // Convert mouse X back to displacement
    // Replicate the layout math from the renderer
    const wallWidth = 18;
    const wallLeft = w * 0.06;
    const availableWidth = w * 0.65;
    const pixelsPerMeter = availableWidth / NATURAL_SPRING_LENGTH;
    const anchorX = wallLeft + wallWidth;
    const massW = 48;
    const eqX = anchorX + NATURAL_SPRING_LENGTH * pixelsPerMeter;

    // Mouse points to center of mass -> massLeft = mx - massW/2
    // massLeft = eqX + x * pixelsPerMeter  =>  x = (massLeft - eqX) / pixelsPerMeter
    const massLeft = mx - massW / 2;
    let newX = (massLeft - eqX) / pixelsPerMeter;

    // Clamp so the spring doesn't invert or go too far
    const maxDisplacement = 2.5;
    const minDisplacement = -NATURAL_SPRING_LENGTH * 0.85; // don't let it fully collapse
    newX = Math.max(minDisplacement, Math.min(maxDisplacement, newX));

    engineRef.current.reset(newX);
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
  const [positionSnapshot, setPositionSnapshot] = useState(paramValues.x0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGraphSnapshot([...graphDataRef.current]);
      setPositionSnapshot(engineRef.current.getState().x);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const estimatedPeriod = 2 * Math.PI * Math.sqrt(paramValues.mass / paramValues.k);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[430px] p-0">
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
                    当前位移
                  </div>
                  <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                    {positionSnapshot.toFixed(2)} m
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                    理论周期
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
              拖动质量块可以直接设置初始位移。阻尼越小，图像与理论简谐曲线越接近。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={graphSnapshot}
        label="位移 x"
        unit="m"
        color="#315ca8"
        xLabel="t (s)"
      />
    </div>
  );
}

export default SpringSim;
