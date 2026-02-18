import { ExtractFunctionCallsResult } from "./ExtractFunctionCallsResult";

export type MatchClientPatternAdvance = {
  client: string;
  pattern: ExtractFunctionCallsResult[];
  detectPattern: ExtractFunctionCallsResult[][];
}

export type PatternCountAdvance = {
  pattern: ExtractFunctionCallsResult[][];
  count: number;
}
