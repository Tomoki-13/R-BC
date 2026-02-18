import { PatternCountAdvance } from "./Advance";

export interface JsonRow {
  failureclient: string;
  detectPatterns: string[][];
}

export interface MatchClientPattern {
  client: string;
  pattern: string[][];
  detectPattern: string[][][];
}

export interface PatternCount {
  pattern: string[][];
  count: number;
}
export interface integrate_type {
  patterns: PatternCount[];
  totalClients: number;
}

export type DetectionOutputAdvance = {
  patterns: PatternCountAdvance[];
  totalClients: number;
  detectedClients: string[];
}

export type DetectionOutput = {
  patterns: PatternCount[];
  totalClients: number;
  detectedClients: string[];
}
