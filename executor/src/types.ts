// rbc の ExtractFunctionCallsResult と同一構造（親プロジェクトへの依存を持たない）
export type ExtractFunctionCallsResult = {
  FunctionCallCode: string;
  filePath: string;
  line: number;
  argTypes: string[][];
  argContexts: string[][];
};

// rawpattern.json 形式：クライアントごとの実際のコードパターン
export type RawPatternEntry = {
  failureclient: string;
  detectPatterns: ExtractFunctionCallsResult[][];
};

// =============================================================
// INPUT
// =============================================================
export type PatternFormat = 'rawpattern' | 'patternList';

export type ExecutorConfig = {
  libName: string;
  preVersion: string;
  postVersion: string;
  // createPattern が出力した JSON のパス
  patternPath: string;
  // 'rawpattern': failure_rawpattern.json（---N プレースホルダー形式）
  // 'patternList': failure_patternList.json（正規表現形式）
  patternFormat: PatternFormat;
  // 0: 切り分けなし（ファイルグループ単位）
  // 1: import 変数単位に細分化（取りこぼし防止）
  splitMode: 0 | 1;
};

// パターン1件ごとの実行結果
export type PatternRunResult = {
  patternIndex: number;
  label: string; // failureclient 名 or "pattern-N"
  script: string;
  pre: { passed: boolean; error?: string };
  post: { passed: boolean; error?: string };
  // pre が通り post が落ちれば後方互換性破壊として確認済み
  isConfirmedBreaking: boolean;
};

// 全体の実行結果
export type ExecutorOutput = {
  libName: string;
  preVersion: string;
  postVersion: string;
  totalPatterns: number;
  confirmedBreaking: number;
  results: PatternRunResult[];
};
