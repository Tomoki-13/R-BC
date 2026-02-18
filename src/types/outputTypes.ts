import { ExtractFunctionCallsResult } from "./ExtractFunctionCallsResult";

export type MatchClientPattern = {
  client: string;
  pattern: ExtractFunctionCallsResult[];
  detectPattern: ExtractFunctionCallsResult[][];
}

export type PatternCount = {
  pattern: ExtractFunctionCallsResult[][];
  count: number;
}

export interface JsonRow {
  failureclient: string;
  detectPatterns: string[][];
}

export interface PatternCount_old {
  pattern: string[][];
  count: number;
}
export interface integrate_type {
  patterns: PatternCount_old[];
  totalClients: number;
}

export type DetectionOutput = {
  patterns: PatternCount[];
  totalClients: number;
  detectedClients: string[];
}

export type DetectionOutput_old = {
  patterns: PatternCount_old[];
  totalClients: number;
  detectedClients: string[];
}
