import { useCallback, useEffect, useRef, useState } from 'react';
import SimCanvas from '../../components/SimCanvas';
import ControlPanel from '../../components/ControlPanel';
import RealtimeGraph from '../../components/RealtimeGraph';
import FormulaCard from '../../components/FormulaCard';
import MathText from '../../components/MathText';
import { type ParamDef } from '../types';
import { createInterferenceEngine, type InterferenceParams } from './interferenceEngine';
import { drawInterference } from './interferenceRenderer';

// ── Parameter definitions ────────────────────────────────────
const paramDefs: ParamDef[] = [
  { key: 'slitDistance', label: '缝距 d', min: 0.5, max: 5, step: 0.1, defaultValue: 2, unit: '' },
  { key: 'wavelength', label: '波长 \u03BB', min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: '' },
  { key: 'screenDistance', label: '屏距 L', min: 5, max: 20, step: 0.5, defaultValue: 10, unit: '' },
];

const formulas = [
  String.raw`d\sin\theta = n\lambda`,
  String.raw`d\sin\theta = \left(n+\frac{1}{2}\right)\lambda`,
  String.raw`\Delta x = \frac{\lambda L}{d}`,
];

const DT = 1 / 60;

function getDefaultParams(): InterferenceParams {
  return {
    slitDistance: 2,
    wavelength: 1,
    screenDistance: 10,
    amplitude: 0.8,
  };
}

function InterferenceSim() {
  // ── Parameter state ──────────────────────────────────────────
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const p of paramDefs) {
      defaults[p.key] = p.defaultValue;
    }
    return defaults;
  });

  const [running, setRunning] = useState(true);

  // ── Engine ref ───────────────────────────────────────────────
  const engineRef = useRef(createInterferenceEngine(getDefaultParams()));

  // ── Graph data for screen intensity ──────────────────────────
  const graphDataRef = useRef<{ t: number; v: number }[]>([]);
  const [graphSnapshot, setGraphSnapshot] = useState<{ t: number; v: number }[]>([]);

  // ── Build engine params from UI values ───────────────────────
  const getEngineParams = useCallback((): InterferenceParams => ({
    slitDistance: paramValues.slitDistance,
    wavelength: paramValues.wavelength,
    screenDistance: paramValues.screenDistance,
    amplitude: 0.8,
  }), [paramValues.slitDistance, paramValues.wavelength, paramValues.screenDistance]);

  // ── Sync params to engine ────────────────────────────────────
  useEffect(() => {
    engineRef.current.setParams(getEngineParams());
  }, [getEngineParams]);

  // ── Screen pattern as graph data ─────────────────────────────
  // Update the intensity-vs-position graph from screen pattern data.
  useEffect(() => {
    const interval = setInterval(() => {
      const engine = engineRef.current;
      const pattern = engine.getScreenPattern(200);
      const maxI = engine.getMaxIntensity() || 1;

      // Convert screen pattern to graph data: t = y position, v = normalized intensity
      const data = pattern.map((sp) => ({
        t: sp.y,
        v: sp.intensity / maxI,
      }));

      graphDataRef.current = data;
      setGraphSnapshot(data);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // ── Animation: advance time ──────────────────────────────────
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    let lastTs = 0;

    const tick = (ts: number) => {
      if (lastTs > 0 && running) {
        const elapsed = Math.min((ts - lastTs) / 1000, DT * 3); // cap for tab-switch
        engineRef.current.step(elapsed);
        timeRef.current = engineRef.current.getTime();
      }
      lastTs = ts;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // ── Canvas draw callback ─────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const engine = engineRef.current;
    const params = engine.getParams();
    const time = engine.getTime();
    const pattern = engine.getScreenPattern(300);

    drawInterference(ctx, w, h, params, time, engine.getFieldAt, pattern);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleParamChange = useCallback((key: string, value: number) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current.reset();
    engineRef.current.setParams(getEngineParams());
    timeRef.current = 0;
    graphDataRef.current = [];
    setGraphSnapshot([]);
    setRunning(true);
  }, [getEngineParams]);

  const handleToggle = useCallback(() => {
    setRunning((r) => !r);
  }, []);

  // ── Derived info ─────────────────────────────────────────────
  const fringeSpacing =
    (paramValues.wavelength * paramValues.screenDistance) /
    Math.max(paramValues.slitDistance, 0.01);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="lab-panel-dark rounded-[1.6rem] p-0">
            <div className="h-[440px]">
              <SimCanvas draw={draw} className="bg-transparent" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">条纹间距</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {fringeSpacing.toFixed(2)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">缝距 d</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {paramValues.slitDistance.toFixed(1)}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">屏距 L</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {paramValues.screenDistance.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={paramDefs}
            values={paramValues}
            onChange={handleParamChange}
            onReset={handleReset}
            running={running}
            onToggle={handleToggle}
          >
            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              观察屏上条纹间距如何随 <MathText math={String.raw`\lambda`} className="math-inline" />、
              <MathText math={String.raw`d`} className="math-inline" />、
              <MathText math={String.raw`L`} className="math-inline" /> 的变化而改变。
              下方曲线显示的是屏幕上沿 <MathText math={String.raw`y`} className="math-inline" />
              方向的归一化光强分布。
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>

      <RealtimeGraph
        data={graphSnapshot}
        label="归一化光强 I / I₀"
        unit=""
        color="#b38433"
        yRange={[0, 1.1]}
        xLabel="屏幕位置 y"
        xFormatter={value => value.toFixed(1)}
        yFormatter={value => value.toFixed(2)}
      />
    </div>
  );
}

export default InterferenceSim;
