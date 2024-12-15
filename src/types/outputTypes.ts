export interface JsonRow {
    failureclient: string;
    detectPatterns: string[][];
}

export interface MatchClientPattern {
    client: string;
    pattern: string[][];
    detectPattern: string[][];
}

export interface DupMatchClientPattern {
    client: string;
    pattern: string[][];
    detectPattern: string[][][];
}

export interface PatternCount {
    pattern: string[][];
    count: number;
}

export interface DetectionOutput {
    patterns: PatternCount[];
    totalCount: number;
}