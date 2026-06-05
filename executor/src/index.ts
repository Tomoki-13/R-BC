import fs from 'fs';
import path from 'path';
import {
  ExecutorConfig,
  ExecutorOutput,
  ExtractFunctionCallsResult,
  PatternRunResult,
  RawPatternEntry,
} from './types';
import { installVersion } from './versionManager';
import { rawPatternToScript, patternListToScript, splitByImportVariable } from './patternToScript';
import { runScript } from './runner';

// =============================================================
// INPUT
// =============================================================
const config: ExecutorConfig = {
  libName: 'uuid',
  preVersion: '3.4.0',
  postVersion: '7.0.0-beta.0',
  patternPath: path.resolve(
    __dirname,
    '../../output/type-method-object/2026-05-12-14-43-38/node-uuid_700beta0/createPattern/repos_node-uuid_700beta0_failure_rawpattern.json'
  ),
  // 'rawpattern': failure_rawpattern.json（推奨）
  // 'patternList': failure_patternList.json（正規表現形式・レガシー）
  patternFormat: 'rawpattern',
  // 0: 切り分けなし（ファイルグループ単位、現状維持）
  // 1: import 変数単位に細分化（取りこぼし防止）
  splitMode: 1,
};
// =============================================================

const OUTPUT_DIR = path.resolve(__dirname, '../output');

type PreparedItem = { label: string; script: string };

/**
 * rawpattern.json を読み込み、splitMode に応じてスクリプトを生成する。
 *
 * splitMode=0: 1ファイルグループ → 1スクリプト
 * splitMode=1: 1ファイルグループ → import 変数ごとに細分化
 *              （import が1つだけなら細分化なし、ラベルも変わらず）
 */
function prepareRawPatterns(
  filePath: string,
  libName: string,
  splitMode: 0 | 1
): PreparedItem[] {
  const entries: RawPatternEntry[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const result: PreparedItem[] = [];

  for (const entry of entries) {
    for (let i = 0; i < entry.detectPatterns.length; i++) {
      const fileGroup = entry.detectPatterns[i];
      const baseLabel =
        entry.detectPatterns.length === 1
          ? path.basename(entry.failureclient)
          : `${path.basename(entry.failureclient)}[${i}]`;

      if (splitMode === 0) {
        // --- mode 0: 切り分けなし ---
        const script = rawPatternToScript(fileGroup, libName);
        result.push({ label: baseLabel, script });
      } else {
        // --- mode 1: import 変数単位に細分化 ---
        const splits = splitByImportVariable(fileGroup);

        if (splits.length === 0) {
          // import が1つ以下 → 分割不要
          const script = rawPatternToScript(fileGroup, libName);
          result.push({ label: baseLabel, script });
        } else {
          // import ごとにサブグループをスクリプト化
          for (const { modulePath, subGroup } of splits) {
            const subLabel = `${baseLabel}/${modulePath}`;
            const script = rawPatternToScript(subGroup, libName);
            result.push({ label: subLabel, script });
          }
        }
      }
    }
  }

  return result;
}

/** patternList.json を読み込みスクリプトを生成する（レガシー） */
function preparePatternList(
  filePath: string,
  libName: string
): PreparedItem[] {
  const patterns: ExtractFunctionCallsResult[][][] = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  );
  return patterns.map((pattern, i) => ({
    label: `pattern-${i}`,
    script: patternListToScript(pattern, libName),
  }));
}

/**
 * スクリプトリストを指定バージョンで一括実行する。
 * バージョンのインストールは1回のみ。
 */
function runAllScripts(
  items: PreparedItem[],
  libName: string,
  version: string,
  versionLabel: string
): Map<number, { passed: boolean; error?: string }> {
  installVersion(libName, version);
  console.log(`\n--- ${versionLabel} (${version}) ---`);

  const resultMap = new Map<number, { passed: boolean; error?: string }>();
  for (let i = 0; i < items.length; i++) {
    const { label, script } = items[i];
    if (!script) {
      console.log(`  [${i + 1}/${items.length}] skip (${label})`);
      continue;
    }
    const result = runScript(script);
    const mark = result.passed ? '✓' : '✗';
    process.stdout.write(`  [${i + 1}/${items.length}] ${mark} ${label}`);
    if (!result.passed) process.stdout.write(`  → ${result.error?.split('\n')[0]}`);
    process.stdout.write('\n');
    resultMap.set(i, result);
  }
  return resultMap;
}

(async () => {
  const { libName, preVersion, postVersion, patternPath, patternFormat, splitMode } = config;

  if (!fs.existsSync(patternPath)) {
    console.error(`pattern file not found: ${patternPath}`);
    process.exit(1);
  }

  console.log(`\n[Executor] ${libName}  ${preVersion} → ${postVersion}`);
  console.log(`Format: ${patternFormat}  SplitMode: ${splitMode}`);
  console.log(`Path: ${patternPath}`);

  // スクリプトを全パターン分生成
  const items =
    patternFormat === 'rawpattern'
      ? prepareRawPatterns(patternPath, libName, splitMode)
      : preparePatternList(patternPath, libName);

  const skipped = items.filter((it) => !it.script).length;
  const runnable = items.length - skipped;
  console.log(`Patterns: ${items.length} total (${runnable} runnable, ${skipped} skipped)`);

  // pre バージョンで全パターンを一括実行
  const preResultMap = runAllScripts(items, libName, preVersion, 'pre');

  // post バージョンで全パターンを一括実行
  const postResultMap = runAllScripts(items, libName, postVersion, 'post');

  // 結果を集約
  const results: PatternRunResult[] = [];
  for (let i = 0; i < items.length; i++) {
    const { label, script } = items[i];
    if (!script) continue;

    const preResult = preResultMap.get(i)!;
    const postResult = postResultMap.get(i)!;
    const isConfirmedBreaking = preResult.passed && !postResult.passed;

    results.push({
      patternIndex: i,
      label,
      script,
      pre: preResult,
      post: postResult,
      isConfirmedBreaking,
    });
  }

  const confirmedBreaking = results.filter((r) => r.isConfirmedBreaking).length;

  // サマリー
  console.log('\n--- Summary ---');
  const breaking = results.filter((r) => r.isConfirmedBreaking);
  for (const r of breaking) {
    console.log(`  ✓ ${r.label}: ${r.post.error?.split('\n')[0]}`);
  }

  const output: ExecutorOutput = {
    libName,
    preVersion,
    postVersion,
    totalPatterns: items.length,
    confirmedBreaking,
    results,
  };

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `${libName}_${preVersion}_${postVersion}_split${splitMode}_execution.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n[Result] confirmed breaking: ${confirmedBreaking} / ${results.length}`);
  console.log(`[Output] ${outPath}`);
})();
