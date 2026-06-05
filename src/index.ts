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
import patternUtils from './patternOperations/patternUtils';

// =============================================================
// INPUT:
// =============================================================
type InputSource = 'direct' | 'file' | 'auto';
const DETECTION_MODE: number = Number(process.argv[2] ?? 2);  // 0=関数のみ / 1=型完全一致 / 2=型一致+objectプロパティの一致
const Input: InputSource = (process.argv[3] as InputSource) ?? 'file';
//   direct: 下の INLINE_TARGETS に直接記述したターゲットを使用
//   file  : datasets/targets.json から読み込む
//   auto  : datasets/test_result.json から全ペアを自動抽出

// Input='direct' のときに使うターゲット
const INLINE_TARGETS: TargetInput[] = [
  { libName: 'uuid', preVersion: '7.0.3', postVersion: '8.0.0-beta.0' },
];
// =============================================================

// 以下は固定（通常変更不要）
const TARGETS_PATH = path.resolve(__dirname, '../datasets/targets.json');
const TEST_RESULT_PATH = path.resolve(__dirname, '../datasets/test_result.json');
// モードに応じて出力先を自動切替: 0 → method / 1 → type-method / 2 → type-method-object
const OUTPUT_BASE: string = path.resolve(__dirname,
  DETECTION_MODE === 0 ? '../output/method' :
  DETECTION_MODE === 1 ? '../output/type-method' :
                         '../output/type-method-object'
);

(async () => {
  let targets: TargetInput[];

  if (Input === 'direct') {
    targets = INLINE_TARGETS;
  } else if (Input === 'file') {
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
  const noUnknownExecutionStats: ExecutionStat[] = [];  // 全unknownパターン除外後の集計
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
        const createRes = await createPattern(getPatternDir, libName, create_outputDir, DETECTION_MODE);
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
        patternFilter: 'all',
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

      // -------------------------------------------------------
      // mode1/2 のみ: unknown のみを引数にもつパターンを除外した追加検出
      // -------------------------------------------------------
      if (DETECTION_MODE >= 1) {
        const noUnknownPatterns = patternUtils.filterOnlyUnknownPatterns(lastpatterns);
        const removedCount = lastpatterns.length - noUnknownPatterns.length;
        console.log(`\n[no_unknown] Filtered patterns: ${lastpatterns.length} → ${noUnknownPatterns.length} (-${removedCount} only-unknown calls)`);

        if (noUnknownPatterns.length > 0) {
          const nu_create_outputDir = outputDir + '/createPattern_no_unknown';
          const nu_detect_outputDir = outputDir + '/detectByPattern_no_unknown';
          output_json.createOutputDirectory(nu_create_outputDir);
          output_json.createOutputDirectory(nu_detect_outputDir);

          fs.writeFileSync(
            path.join(nu_create_outputDir, `${path.basename(getPatternDir)}_patternList_no_unknown.json`),
            JSON.stringify(noUnknownPatterns, null, 4), 'utf8'
          );

          const nuStatsResult = await support_detectByPatternWithStats(
            getPatternDir, matchDir, libName, noUnknownPatterns, nu_detect_outputDir, true, DETECTION_MODE
          );

          noUnknownExecutionStats.push({
            id: idCounter++,
            library: libName,
            preVersion,
            postVersion,
            patternFilter: 'no_unknown',
            totalFailureDirs: nuStatsResult.failureResult.scannedDirCount,
            patternAnalyzedClientsCount: patternAnalyzedCount,
            createdPatternCount: noUnknownPatterns.length,
            failureDetectedClientsCount: nuStatsResult.failureResult.totalClients,
            failureValid: nuStatsResult.failureResult.validDetectedCount,
            failureNoTest: nuStatsResult.failureResult.notestCount,
            failureStandard: nuStatsResult.failureResult.standardCount,
            failureNoScript: nuStatsResult.failureResult.noscriptCount,
            failureNoPkg: nuStatsResult.failureResult.noPackagejsonCount,
            totalSuccessDirs: nuStatsResult.successResult.scannedDirCount,
            successDetectedClientsCount: nuStatsResult.successResult.totalClients,
            successUsedPatternCount: nuStatsResult.successResult.patterns.length,
            successValid: nuStatsResult.successResult.validDetectedCount,
            successNoTest: nuStatsResult.successResult.notestCount,
            successStandard: nuStatsResult.successResult.standardCount,
            successNoScript: nuStatsResult.successResult.noscriptCount,
            successNoPkg: nuStatsResult.successResult.noPackagejsonCount,
            outputPath: nu_detect_outputDir
          });

          console.log(`[no_unknown] Detected in Failure: ${nuStatsResult.failureResult.totalClients}`);
          console.log(`[no_unknown] Detected in Success: ${nuStatsResult.successResult.totalClients}`);
        } else {
          console.log('[no_unknown] No typed patterns remain after filtering. Skipping no_unknown detection.');
        }
      }
    } catch (err) {
      console.error(`Error processing ${libName} ${cleanVersion}:`, err);
    }

    console.log('--------------------------------------------\n');
    if (global.gc) global.gc();
  }

  const csvDir = path.join(OUTPUT_BASE, date);
  if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

  if (executionStats.length === 0 && noUnknownExecutionStats.length === 0) {
    console.log('\nNo valid data processed.');
  }

  // all のみ
  if (executionStats.length > 0) {
    const csvPath = path.join(csvDir, `execution_summary_all_${date}.csv`);
    fs.writeFileSync(csvPath, CSV_HEADER + executionStats.map(statToCsvRow).join('\n'), 'utf8');
    console.log(`\nExecution Summary (all) CSV: ${csvPath}`);
  }

  // no_unknown のみ
  if (noUnknownExecutionStats.length > 0) {
    const nuCsvPath = path.join(csvDir, `execution_summary_no_unknown_${date}.csv`);
    fs.writeFileSync(nuCsvPath, CSV_HEADER + noUnknownExecutionStats.map(statToCsvRow).join('\n'), 'utf8');
    console.log(`Execution Summary (no_unknown) CSV: ${nuCsvPath}`);
  }

  // all + no_unknown を交互に並べた比較用（同一ライブラリの行が隣接）
  const combinedStats: ExecutionStat[] = [];
  for (let i = 0; i < Math.max(executionStats.length, noUnknownExecutionStats.length); i++) {
    if (i < executionStats.length)          combinedStats.push(executionStats[i]);
    if (i < noUnknownExecutionStats.length) combinedStats.push(noUnknownExecutionStats[i]);
  }
  if (combinedStats.length > 0) {
    const combinedPath = path.join(csvDir, `execution_summary_combined_${date}.csv`);
    fs.writeFileSync(combinedPath, CSV_HEADER + combinedStats.map(statToCsvRow).join('\n'), 'utf8');
    console.log(`Execution Summary (combined) CSV: ${combinedPath}`);
  }
})();
