import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import { extractImportLines } from '../utils/extractImportLines';
import { funcNameIdentifiers } from '../utils/funcNameIdentifiers';
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
import output_json from '../utils/output_json';

export interface LibFunctionCoverageResult {
  /** "lib.v4" など各関数式が何パターンで使われているか */
  functionCounts: { [funcExpr: string]: number };
  /** 全パターンで登場するlib関数の一覧（ソート済み） */
  allFunctions: string[];
}

/**
 * 1クライアントのファイル群を読み込み、libName のインポートから
 * 使用されているライブラリ関数を "lib.xxx" 形式で抽出する。
 *
 * - named import（`import { v4 } from 'lib'`）→ 関数名をそのまま `lib.v4` に変換
 * - default import + メソッド呼び出し（`uuid.v4()`）→ `lib.v4`
 * - default import + 直接呼び出し（`uuid()`）→ `lib()`
 *
 * @param filePaths 解析対象のファイルパス一覧
 * @param libName 対象ライブラリ名
 * @returns このクライアントで使われている lib 関数式の配列（ソート済み）
 */
async function extractFromFiles(filePaths: string[], libName: string): Promise<string[]> {
  const funcSet = new Set<string>();

  for (const filePath of filePaths) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;

    let fileContent: string;
    try {
      fileContent = await fsPromises.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const importLines = extractImportLines(fileContent, libName);

    for (const line of importLines) {
      const funcNames = funcNameIdentifiers(line, libName);
      if (funcNames.length === 0) continue;

      // named import: { v4, v5 } のように関数名自体がライブラリの公開関数
      const isNamedImport =
        /import\s*\{/.test(line) ||
        /(?:const|var|let)\s*\{/.test(line);

      if (isNamedImport) {
        for (const name of funcNames) {
          funcSet.add(`lib.${name}`);
        }
      } else {
        // default import / require: ファイル内のメソッド呼び出しを追跡
        const libVar = funcNames[0];
        const escaped = libVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // lib.method( パターンを収集
        const methodPattern = new RegExp(`\\b${escaped}\\.(\\w+)\\s*\\(`, 'g');
        let match: RegExpExecArray | null;
        let foundMethod = false;
        while ((match = methodPattern.exec(fileContent)) !== null) {
          funcSet.add(`lib.${match[1]}`);
          foundMethod = true;
        }

        // メソッド呼び出しがなければ直接呼び出しとして扱う
        if (!foundMethod) {
          const directPattern = new RegExp(`(?<![.\\w])${escaped}\\s*\\(`, 'g');
          if (directPattern.test(fileContent)) {
            funcSet.add('lib()');
          }
        }
      }
    }
  }

  return [...funcSet].sort();
}

/**
 * createPattern の rawPattern 出力からライブラリ関数のカバレッジを集計し、
 * JSON ファイルとして書き出す。
 *
 * rawPattern 内の各エントリが持つ filePath を使って元ファイルを再解析するため、
 * useAst の変数抽象化（`---N` 置換）による情報欠落の影響を受けない。
 *
 * 出力 JSON 例:
 * ```json
 * {
 *   "allFunctions": ["lib.v4", "lib.v5"],
 *   "functionCounts": { "lib.v4": 120, "lib.v5": 30 }
 * }
 * ```
 *
 * @param rawPattern createPattern が返す rawPattern（useAst mode 1 の出力）
 * @param libName 対象ライブラリ名
 * @param outputDir 出力先ディレクトリ
 * @param patternDirName 出力ファイル名のプレフィックスに使うディレクトリ名
 * @returns カバレッジ集計結果
 */
export async function extractLibFunctionCoverage(
  rawPattern: ExtractFunctionCallsResult[][][],
  libName: string,
  outputDir: string,
  patternDirName: string
): Promise<LibFunctionCoverageResult> {
  const functionCounts: { [funcExpr: string]: number } = {};

  for (const clientPattern of rawPattern) {
    // クライアント内の全ファイルパスを重複なく収集
    const filePaths = [
      ...new Set(
        clientPattern
          .flat()
          .map((block: ExtractFunctionCallsResult) => block.filePath)
          .filter((p: string): p is string => typeof p === 'string' && p.length > 0)
      )
    ];

    const funcs = await extractFromFiles(filePaths, libName);

    for (const f of funcs) {
      functionCounts[f] = (functionCounts[f] ?? 0) + 1;
    }
  }

  const allFunctions = Object.keys(functionCounts).sort();
  const result: LibFunctionCoverageResult = { functionCounts, allFunctions };

  const outputPath = output_json.getUniqueOutputPath(outputDir, patternDirName, 'libFunctionCoverage');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

  console.log('========== extractLibFunctionCoverage ============');
  console.log('lib:', libName);
  console.log('coverage functions:', allFunctions);
  console.log('output:', outputPath);
  console.log('==================================================');

  return result;
}
