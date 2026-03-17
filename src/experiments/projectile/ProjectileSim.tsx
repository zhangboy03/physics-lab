import { useState, useRef, useCallback, useEffect } from 'react';
import SimCanvas from '../../components/SimCanvas';
import ControlPanel from '../../components/ControlPanel';
import FormulaCard from '../../components/FormulaCard';
import RealtimeGraph from '../../components/RealtimeGraph';
import type { ParamDef } from '../types';
import {
  createProjectileEngine,
  computeTrajectory,
  type ProjectileParams,
  type ProjectileState,
  type Trajectory,
} from './projectileEngine';
import {
  drawProjectileFrame,
  getLaunchArea,
  mouseToLaunchVector,
} from './projectileRenderer';

const PARAM_DEFS: ParamDef[] = [
  { key: 'v0', label: '初速度 v\u2080', min: 1, max: 50, step: 0.5, defaultValue: 20, unit: 'm/s' },
  { key: 'angle', label: '发射角度 \u03b1', min: 0, max: 90, step: 1, defaultValue: 45, unit: '\u00b0' },
  { key: 'gravity', label: '重力 g', min: 1, max: 20, step: 0.5, defaultValue: 9.8, unit: 'm/s\u00b2' },
  { key: 'height', label: '初始高度 h\u2080', min: 0, max: 20, step: 0.5, defaultValue: 0, unit: 'm' },
];

const FORMULAS = [
  String.raw`x = v_0\cos\alpha \cdot t`,
  String.raw`y = h_0 + v_0\sin\alpha \cdot t - \frac{1}{2}gt^2`,
  String.raw`R = \frac{v_0^2\sin(2\alpha)}{g}`,
  String.raw`T = \frac{2v_0\sin\alpha}{g}`,
];

const DT = 1 / 60; // 60 FPS physics step
const SPEED_MULTIPLIER = 1; // real-time playback

function getDefaultValues(): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const p of PARAM_DEFS) vals[p.key] = p.defaultValue;
  return vals;
}

function paramsFromValues(values: Record<string, number>): ProjectileParams {
  return {
    v0: values.v0,
    angle: values.angle,
    gravity: values.gravity,
    height: values.height,
  };
}

export default function ProjectileSim() {
  const [values, setValues] = useState<Record<string, number>>(getDefaultValues);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<ProjectileState | null>(null);
  const [activeTrajectory, setActiveTrajectory] = useState<Trajectory | null>(null);
  const [historyTrajectories, setHistoryTrajectories] = useState<Trajectory[]>([]);
  const [trajectoryPoints, setTrajectoryPoints] = useState<{ t: number; v: number }[]>([]);
  const [dragging, setDragging] = useState(false);

  const engineRef = useRef<ReturnType<typeof createProjectileEngine> | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Start/stop animation
  useEffect(() => {
    if (!running || !engineRef.current) {
      return undefined;
    }

    lastTimeRef.current = 0;

    const animate = (timestamp: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const steps = Math.max(1, Math.round(elapsed / DT));
      const actualDt = (elapsed * SPEED_MULTIPLIER) / steps;
      for (let i = 0; i < steps; i++) {
        engine.step(actualDt);
      }

      const currentState = engine.getState();
      setState(currentState);

      setTrajectoryPoints((prev) => {
        const next = [...prev, { t: currentState.x, v: currentState.y }];
        if (next.length > 2000) return next.slice(-2000);
        return next;
      });

      if (currentState.active) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setRunning(false);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const handleLaunch = useCallback(() => {
    // If there's a previous active trajectory that finished, save it to history
    if (activeTrajectory && state && !state.active) {
      setHistoryTrajectories((prev) => [...prev, activeTrajectory]);
    }

    const params = paramsFromValues(values);
    const engine = createProjectileEngine(params);
    engineRef.current = engine;

    const traj = computeTrajectory(params);
    setActiveTrajectory(traj);
    setState(engine.getState());
    setTrajectoryPoints([{ t: 0, v: params.height }]);
    setRunning(true);
  }, [values, activeTrajectory, state]);

  const handleClear = useCallback(() => {
    setHistoryTrajectories([]);
    setActiveTrajectory(null);
    setState(null);
    setTrajectoryPoints([]);
    setRunning(false);
    engineRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleParamChange = useCallback((key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Toggle acts as launch for this experiment
  const handleToggle = useCallback(() => {
    if (running) {
      // Pause: stop animation but keep state
      setRunning(false);
    } else if (state && state.active) {
      // Resume paused flight
      setRunning(true);
    } else {
      // New launch
      handleLaunch();
    }
  }, [running, state, handleLaunch]);

  const handleReset = useCallback(() => {
    handleClear();
    setValues(getDefaultValues());
  }, [handleClear]);

  // Canvas draw callback
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const progress = engineRef.current ? engineRef.current.getProgress() : 0;
      drawProjectileFrame(
        ctx,
        w,
        h,
        state,
        activeTrajectory,
        historyTrajectories,
        { angle: values.angle, height: values.height },
        progress,
      );
    },
    [state, activeTrajectory, historyTrajectories, values.angle, values.height],
  );

  // Mouse interaction: drag on launch area to set angle + speed
  const handleMouseDown = useCallback(
    (x: number, y: number, w: number, h: number) => {
      if (running) return;
      const maxX = activeTrajectory?.maxX ?? 1;
      const maxY = activeTrajectory?.maxY ?? 1;
      const area = getLaunchArea(w, h, maxX, maxY, values.height);
      const dist = Math.sqrt((x - area.cx) ** 2 + (y - area.cy) ** 2);
      if (dist < area.radius) {
        setDragging(true);
        const { angle, v0 } = mouseToLaunchVector(x, y, area.cx, area.cy);
        setValues((prev) => ({ ...prev, angle, v0 }));
      }
    },
    [running, activeTrajectory, values.height],
  );

  const handleMouseMove = useCallback(
    (x: number, y: number, w: number, h: number) => {
      if (!dragging) return;
      const maxX = activeTrajectory?.maxX ?? 1;
      const maxY = activeTrajectory?.maxY ?? 1;
      const area = getLaunchArea(w, h, maxX, maxY, values.height);
      const { angle, v0 } = mouseToLaunchVector(x, y, area.cx, area.cy);
      setValues((prev) => ({ ...prev, angle, v0 }));
    },
    [dragging, activeTrajectory, values.height],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Compute preview trajectory for display info
  const previewTrajectory = computeTrajectory(paramsFromValues(values));
  const analyticalRange = previewTrajectory.maxX;
  const analyticalMaxH = previewTrajectory.maxY;
  const analyticalTime = previewTrajectory.totalTime;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[500px] p-0">
            <SimCanvas
              draw={draw}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">理论射程</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {analyticalRange.toFixed(2)} m
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">最大高度</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {analyticalMaxH.toFixed(2)} m
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">飞行时间</div>
              <div className="mono-data mt-3 text-[24px] font-semibold text-[var(--color-ink)]">
                {analyticalTime.toFixed(2)} s
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ControlPanel
            params={PARAM_DEFS}
            values={values}
            onChange={handleParamChange}
            running={running}
            onToggle={handleToggle}
            onReset={handleReset}
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={running}
                className="control-button is-primary flex-1 px-4 py-2 text-[13px] font-semibold"
              >
                发射
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="control-button flex-1 px-4 py-2 text-[13px] font-medium"
              >
                清除轨迹
              </button>
            </div>

            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              可以直接在发射口附近拖动鼠标，用手势同时改角度和初速度。
            </div>
          </ControlPanel>

          <FormulaCard formulas={FORMULAS} />

          {historyTrajectories.length > 0 ? (
            <div className="lab-panel rounded-[1.5rem] p-5 text-[14px] leading-6 text-[var(--color-ink-soft)]">
              已保留 <span className="mono-data font-semibold text-[var(--color-ink)]">{historyTrajectories.length}</span>{' '}
              条历史轨迹，方便你做同一角度下不同速度的对比。
            </div>
          ) : null}
        </div>
      </div>

      <RealtimeGraph
        data={trajectoryPoints}
        label="轨迹剖面 y"
        unit="m"
        color="#c45a28"
        height={180}
        xLabel="x (m)"
      />
    </div>
  );
}
