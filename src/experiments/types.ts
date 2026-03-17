export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

export interface ExperimentConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  formulas: string[];
  params: ParamDef[];
  color: string;
}

export interface SimState {
  time: number;
  running: boolean;
  params: Record<string, number>;
}
