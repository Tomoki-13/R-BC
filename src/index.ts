import v8 from 'v8';
v8.setFlagsFromString('--expose_gc');

import path from 'path';
import fs from 'fs';

import { createOnlyCall, createPattern } from './core/createPattern';
import { support_detectByPatternWithStats } from './core/detectByPattern';
import { TargetInput } from './types/TargetInput';
import { ExecutionStat, CSV_HEADER, statToCsvRow } from './types/ExecutionStat';
import { loadTargetsFromFile, loadTargetsFromTestResult } from './utils/loadTargets';
import output_json from './utils/output_json';
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';

// =============================================================
// INPUT — 実行前にここだけ確認・変更する
// [1] インライン: INLINE_TARGETS に配列を設定（最優先）
// [2] ファイル: TARGETS_PATH にパスを設定（[1] が null のとき使用）
// [3] 全データ: 両方 null にすると TEST_RESULT_PATH から自動抽出
// モード: 0=関数のみ / 1=型完全一致 / 2=型＋objectキー部分一致まで検出
const INLINE_TARGETS: TargetInput[] | null = null;
// const INLINE_TARGETS: TargetInput[] | null = [{ libName: 'uuid', preVersion: '7.0.3', postVersion: '8.0.0-beta.0' }];
// const TARGETS_PATH: string | null = path.resolve(__dirname, '../datasets/targets.json');
const TARGETS_PATH: string | null = null;
const TEST_RESULT_PATH: string = path.resolve(__dirname, '../datasets/test_result.json');
const DETECTION_MODE: number = 0;
// モードに応じて出力先を自動切替: 0 → method / 1 → type-method / 2 → type-method-object
const OUTPUT_BASE: string = path.resolve(process.cwd(),
  DETECTION_MODE === 0 ? '../output/test/method' :
  DETECTION_MODE === 1 ? '../output/test/type-method' :
                         '../output/test/type-method-object'
);
// =============================================================

(async () => {
  let targets: TargetInput[];

  if (INLINE_TARGETS !== null) {
    targets = INLINE_TARGETS;
  } else if (TARGETS_PATH !== null) {
    try {
      targets = loadTargetsFromFile(TARGETS_PATH);
    } catch (error) {
      console.error('Error reading targets file:', error);
      return;
    }
  } else {
    try {
      targets = loadTargetsFromTestResult(TEST_RESULT_PATH);
    } catch (error) {
      console.error('Error reading test_result.json:', error);
      return;
    }
  }

  if (targets.length === 0) {
    console.error('Error: No targets found.');
    return;
  }

  const now = new Date();
  const date = output_json.formatDateTime(now);
  const executionStats: ExecutionStat[] = [];
  let idCounter = 1;

  console.log(`Target count: ${targets.length}`);

  for (const target of targets) {
    const { libName, preVersion, postVersion } = target;
    const cleanVersion = postVersion.replace(/[^a-zA-Z0-9]/g, '');

    const getPatternDir = path.resolve(__dirname, `../alldataset_clients/${libName}/${cleanVersion}/failure`);
    const matchDir = path.resolve(__dirname, `../alldataset_clients/${libName}/${cleanVersion}/success`);

    if (!fs.existsSync(getPatternDir) || !fs.existsSync(matchDir)) {
      console.log(`Skipping ${libName} ${cleanVersion}: directories not found.`);
      continue;
    }

    const outputDir = path.join(OUTPUT_BASE, date, `${libName}_${cleanVersion}`);
    const create_outputDir = outputDir + '/createPattern';
    const detect_outputDir = outputDir + '/detectByPattern';
    output_json.createOutputDirectory(create_outputDir);
    output_json.createOutputDirectory(detect_outputDir);

    console.log(`\n----------- Processing ${libName} (${cleanVersion}) -----------`);
    let lastpatterns: ExtractFunctionCallsResult[][][] = [];
    let patternAnalyzedCount = 0;

    try {
      if (DETECTION_MODE === 0) {
        // 関数のみ: 呼び出しパターンだけで解析
        const createRes = await createOnlyCall(getPatternDir, libName, create_outputDir);
        lastpatterns = createRes.patterns;
        patternAnalyzedCount = createRes.summary.analyzedClients;
      } else {
        // 型あり: 引数の型情報も含めて解析
        const createRes = await createPattern(getPatternDir, libName, create_outputDir);
        lastpatterns = createRes.convertedPattern;
        patternAnalyzedCount = createRes.stats.validClients;
      }

      const statsResult = await support_detectByPatternWithStats(
        getPatternDir, matchDir, libName, lastpatterns, detect_outputDir, true, DETECTION_MODE
      );

      executionStats.push({
        id: idCounter++,
        library: libName,
        preVersion,
        postVersion,
        totalFailureDirs: statsResult.failureResult.scannedDirCount,
        patternAnalyzedClientsCount: patternAnalyzedCount,
        createdPatternCount: lastpatterns.length,
        failureDetectedClientsCount: statsResult.failureResult.totalClients,
        failureValid: statsResult.failureResult.validDetectedCount,
        failureNoTest: statsResult.failureResult.notestCount,
        failureStandard: statsResult.failureResult.standardCount,
        failureNoScript: statsResult.failureResult.noscriptCount,
        failureNoPkg: statsResult.failureResult.noPackagejsonCount,
        totalSuccessDirs: statsResult.successResult.scannedDirCount,
        successDetectedClientsCount: statsResult.successResult.totalClients,
        successUsedPatternCount: statsResult.successResult.patterns.length,
        successValid: statsResult.successResult.validDetectedCount,
        successNoTest: statsResult.successResult.notestCount,
        successStandard: statsResult.successResult.standardCount,
        successNoScript: statsResult.successResult.noscriptCount,
        successNoPkg: statsResult.successResult.noPackagejsonCount,
        outputPath: outputDir
      });

      console.log(`Created Patterns: ${lastpatterns.length}`);
      console.log(`Detected in Failure: ${statsResult.failureResult.totalClients}`);
      console.log(`Detected in Success: ${statsResult.successResult.totalClients}`);
    } catch (err) {
      console.error(`Error processing ${libName} ${cleanVersion}:`, err);
    }

    console.log('--------------------------------------------\n');
    if (global.gc) global.gc();
  }

  if (executionStats.length > 0) {
    const csvDir = path.join(OUTPUT_BASE, date);
    if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });
    const csvPath = path.join(csvDir, `execution_summary_${date}.csv`);
    fs.writeFileSync(csvPath, CSV_HEADER + executionStats.map(statToCsvRow).join('\n'), 'utf8');
    console.log(`\nExecution Summary CSV: ${csvPath}`);
  } else {
    console.log('\nNo valid data processed.');
  }
})();
