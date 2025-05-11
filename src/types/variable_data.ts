export interface ScopeRange {
  start: number;
  end: number;
}

export interface VariableUsage {
  type: string;
  code: string;
  scopePath: string;
}

