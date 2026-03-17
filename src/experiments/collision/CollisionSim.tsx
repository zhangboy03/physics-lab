import { useCallback, useEffect, useRef, useState } from 'react';
import SimCanvas from '../../components/SimCanvas';
import ControlPanel from '../../components/ControlPanel';
import FormulaCard from '../../components/FormulaCard';
import { type ParamDef } from '../../experiments/types';
import { createCollisionEngine, type CollisionParams, type MomentumInfo, type KEInfo } from './collisionEngine';
import { drawCollision } from './collisionRenderer';

// ---------------------------------------------------------------------------
// Parameter definitions
// ---------------------------------------------------------------------------

const paramDefs: ParamDef[] = [
  { key: 'm1', label: '质量 m\u2081', min: 0.5, max: 5, step: 0.1, defaultValue: 2, unit: 'kg' },
  { key: 'm2', label: '质量 m\u2082', min: 0.5, max: 5, step: 0.1, defaultValue: 1, unit: 'kg' },
  { key: 'v1', label: '速度 v\u2081', min: -10, max: 10, step: 0.5, defaultValue: 3, unit: 'm/s' },
  { key: 'v2', label: '速度 v\u2082', min: -10, max: 10, step: 0.5, defaultValue: -2, unit: 'm/s' },
];

const formulas = [
  String.raw`p = mv`,
  String.raw`\sum p_{\text{before}} = \sum p_{\text{after}}`,
  String.raw`\frac{1}{2}m_1v_1^2 + \frac{1}{2}m_2v_2^2 = \text{const}`,
  String.raw`v_f = \frac{m_1v_1 + m_2v_2}{m_1 + m_2}`,
];

const DT = 1 / 60;

// ---------------------------------------------------------------------------
// Comparison bar chart (momentum or KE)
// ---------------------------------------------------------------------------

interface BarChartProps {
  title: string;
  before: number;
  after: number;
  label1: string;
  label2: string;
  color1: string;
  color2: string;
  showLoss?: boolean;
  loss?: number;
}

function ComparisonBar({ title, before, after, label1, label2, color1, color2, showLoss, loss }: BarChartProps) {
  const maxVal = Math.max(Math.abs(before), Math.abs(after), 0.01);
  const toW = (v: number) => `${(Math.abs(v) / maxVal) * 100}%`;

  return (
    <div className="lab-panel rounded-[1.5rem] p-5">
      <div className="panel-caption">Comparison</div>
      <h4 className="mt-2 text-[18px] font-semibold text-[var(--color-ink)]">{title}</h4>
      <div className="paper-rule mt-4" />
      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-[12px] text-[var(--color-ink-soft)]">
            <span>{label1}</span>
            <span className="mono-data">{before.toFixed(2)}</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.65)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: toW(before), backgroundColor: color1 }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[12px] text-[var(--color-ink-soft)]">
            <span>{label2}</span>
            <span className="mono-data">{after.toFixed(2)}</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.65)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: toW(after), backgroundColor: color2 }}
            />
          </div>
        </div>
        {showLoss && loss !== undefined && loss > 0.001 ? (
          <div className="text-[12px] font-medium text-[var(--color-accent)]">
            能量损失: {loss.toFixed(3)} J ({((loss / (Math.abs(before) || 1)) * 100).toFixed(1)}%)
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle button group
// ---------------------------------------------------------------------------

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={value === opt.value ? 'is-active' : ''}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function CollisionSim() {
  // --- Parameter state ---
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const p of paramDefs) {
      defaults[p.key] = p.defaultValue;
    }
    return defaults;
  });

  const [collisionType, setCollisionType] = useState<'elastic' | 'inelastic'>('elastic');
  const [running, setRunning] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [momentum, setMomentum] = useState<MomentumInfo | null>(null);
  const [ke, setKE] = useState<KEInfo | null>(null);
  // Render tick counter to trigger SimCanvas redraws during animation
  const [, setTick] = useState(0);

  // --- Refs ---
  const engineRef = useRef(
    createCollisionEngine({
      m1: 2,
      m2: 1,
      v1: 3,
      v2: -2,
      type: 'elastic',
    }),
  );
  const animationIdRef = useRef<number>(0);

  // --- Build engine params from UI ---
  const getEngineParams = useCallback(
    (): CollisionParams => ({
      m1: paramValues.m1,
      m2: paramValues.m2,
      v1: paramValues.v1,
      v2: paramValues.v2,
      type: collisionType,
    }),
    [paramValues.m1, paramValues.m2, paramValues.v1, paramValues.v2, collisionType],
  );

  // --- Reset ---
  const resetSim = useCallback(() => {
    const engine = engineRef.current;
    engine.setParams(getEngineParams());
    engine.reset();
    setRunning(false);
    setLaunched(false);
    // Pre-compute comparison data
    setMomentum(engine.getMomentum());
    setKE(engine.getKE());
    setTick((t) => t + 1);
  }, [getEngineParams]);

  // Sync params to engine when they change (only if not running)
  useEffect(() => {
    if (!launched) {
      const engine = engineRef.current;
      engine.setParams(getEngineParams());
      engine.reset();
      setMomentum(engine.getMomentum());
      setKE(engine.getKE());
      setTick((t) => t + 1);
    }
  }, [getEngineParams, launched]);

  // --- Launch ---
  const handleLaunch = useCallback(() => {
    const engine = engineRef.current;
    engine.setParams(getEngineParams());
    engine.reset();
    setMomentum(engine.getMomentum());
    setKE(engine.getKE());
    setRunning(true);
    setLaunched(true);
  }, [getEngineParams]);

  // --- Handle param change ---
  const handleParamChange = useCallback(
    (key: string, value: number) => {
      setParamValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // --- Handle reset button ---
  const handleReset = useCallback(() => {
    resetSim();
  }, [resetSim]);

  // --- Animation loop (physics stepping + trigger redraws) ---
  useEffect(() => {
    const engine = engineRef.current;

    const tick = () => {
      if (running) {
        engine.step(DT);

        // Stop running once objects have moved far off screen
        const s = engine.getState();
        if (s.phase === 'post' && (Math.abs(s.x1) > 20 || Math.abs(s.x2) > 20)) {
          setRunning(false);
        }

        // Trigger a redraw by updating tick counter
        setTick((t) => t + 1);
      }

      animationIdRef.current = requestAnimationFrame(tick);
    };

    animationIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationIdRef.current);
  }, [running]);

  // --- Canvas draw callback (receives CSS-pixel w/h from SimCanvas) ---
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const engine = engineRef.current;
      drawCollision(ctx, w, h, engine.getState(), engine.getParams());
    },
    [],
  );

  const willCollide = paramValues.v1 > paramValues.v2;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="canvas-shell h-[430px] p-0">
            <SimCanvas draw={draw} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {momentum ? (
              <ComparisonBar
                title="动量对比 (kg·m/s)"
                before={momentum.before}
                after={momentum.after}
                label1="碰撞前 Σp"
                label2="碰撞后 Σp"
                color1="#315ca8"
                color2="#3f6f55"
              />
            ) : null}
            {ke ? (
              <ComparisonBar
                title="动能对比 (J)"
                before={ke.before}
                after={ke.after}
                label1="碰撞前 ΣKE"
                label2="碰撞后 ΣKE"
                color1="#c45a28"
                color2="#8e3928"
                showLoss={collisionType === 'inelastic'}
                loss={ke.loss}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="lab-panel rounded-[1.5rem] p-5">
            <div className="panel-caption">Collision Type</div>
            <h4 className="mt-2 text-[20px] font-semibold text-[var(--color-ink)]">碰撞类型</h4>
            <div className="paper-rule mt-5" />
            <div className="mt-5">
              <ToggleGroup
                options={[
                  { value: 'elastic' as const, label: '弹性碰撞' },
                  { value: 'inelastic' as const, label: '完全非弹性' },
                ]}
                value={collisionType}
                onChange={(v) => {
                  setCollisionType(v);
                  if (launched) {
                    resetSim();
                  }
                }}
              />
            </div>
          </div>

          <ControlPanel
            params={paramDefs}
            values={paramValues}
            onChange={handleParamChange}
            running={running}
            onToggle={() => {
              if (!launched) {
                handleLaunch();
              } else {
                setRunning((r) => !r);
              }
            }}
            onReset={handleReset}
          >
            {!launched ? (
              <button
                type="button"
                onClick={handleLaunch}
                className="control-button is-primary w-full px-4 py-2 text-[14px] font-semibold"
              >
                开始碰撞
              </button>
            ) : null}

            <div className="rounded-[1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.45)] p-4 text-[13px] leading-6 text-[var(--color-ink-soft)]">
              {willCollide
                ? '当前初速度设置下，两物体会相向接近并发生碰撞。'
                : '当前两物体不会相遇。把 v₁ 调大或把 v₂ 调小，就能看到真正的碰撞过程。'}
            </div>
          </ControlPanel>

          <FormulaCard formulas={formulas} />
        </div>
      </div>
    </div>
  );
}

export default CollisionSim;
