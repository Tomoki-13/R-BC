import v8 from 'v8';
v8.setFlagsFromString('--expose_gc');
import output_json from "./utils/output_json";
import fs from 'fs';
import path from 'path';

import { createOnlyCall } from "./core/createPattern";
import { support_detectByPatternWithStats } from './core/detectByPattern';
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';

// 入力データ用の型定義
interface InputData {
  failureDir: string;
  successDir: string;
  libName: string;
  cleanVersion: string;
  preVersion: string;
  postVersion: string;
}

// アップデートペア用の型定義
interface TargetUpdate {
  nameWithOwner: string;
  oldVersion: string;
  newVersion: string;
  libName: string;
}

// 実行ごとの統計情報（CSV出力用）
interface ExecutionStat {
  id: number;
  library: string;
  preVersion: string;
  postVersion: string;
  totalFailureDirs: number;            // クローンしたテスト失敗数
  patternAnalyzedClientsCount: number; // 条件を通過した(分析で使う)クライアント数
  failureDetectedClientsCount: number; // そのうち検出したクライアント数(失敗)
  failureValid: number;
  failureNoTest: number;
  failureStandard: number;
  failureNoScript: number;
  failureNoPkg: number;
  createdPatternCount: number;         // 生成したパターン数
  totalSuccessDirs: number;            // クローンしたテスト成功数
  successDetectedClientsCount: number; // そのうち検出したクライアント数(成功)
  successValid: number;
  successNoTest: number;
  successStandard: number;
  successNoScript: number;
  successNoPkg: number;
  outputPath: string;
}

/**
 * test_result.jsonからのアップデートペア自動抽出
 * 抽出条件: 同一クライアント内でテストされたバージョンをソートし、隣接するバージョンのペアを作成
 * 古い方のバージョンでstateが"success"であるペアのみを抽出対象とする
 */
function extractUpdatesFromResults(testResults: any[]): TargetUpdate[] {
  const updatesMap = new Map<string, TargetUpdate>();
  const libClientMap = new Map<string, Map<string, any[]>>();

  for (const record of testResults) {
    const lib = record.L__nameWithOwner;
    const client = record.S__nameWithOwner;

    if (!libClientMap.has(lib)) libClientMap.set(lib, new Map());
    const clientMap = libClientMap.get(lib)!;

    if (!clientMap.has(client)) clientMap.set(client, []);
    clientMap.get(client)!.push(record);
  }

  for (const [lib, clientMap] of libClientMap.entries()) {
    for (const [client, records] of clientMap.entries()) {
      // localeCompareのみではプレリリース版(betaなど)の順序が狂うため、
      // SemVerの仕様に基づいたカスタムソートを適用
      const versions = [...new Set(records.map(r => r.L__version))].sort((a, b) => {
        const parseVer = (v: string) => {
          const dashIdx = v.indexOf('-');
          const main = dashIdx > -1 ? v.slice(0, dashIdx) : v;
          const pre = dashIdx > -1 ? v.slice(dashIdx + 1) : '';
          return { parts: main.split('.').map(Number), pre };
        };

        const vA = parseVer(a);
        const vB = parseVer(b);

        // 1. メジャー・マイナー・パッチバージョンの数字を比較
        for (let i = 0; i < Math.max(vA.parts.length, vB.parts.length); i++) {
          const numA = vA.parts[i] || 0;
          const numB = vB.parts[i] || 0;
          if (numA !== numB) return numA - numB;
        }

        // 2. 正規版とプレリリース版の比較 (プレリリース版の方が「古い」扱い)
        if (vA.pre && !vB.pre) return -1;
        if (!vA.pre && vB.pre) return 1;
        
        // 3. 両方プレリリース版の場合はアルファベット順(numeric考慮)で比較
        if (vA.pre && vB.pre) return vA.pre.localeCompare(vB.pre, undefined, { numeric: true, sensitivity: 'base' });

        return 0;
      });

      if (versions.length >= 2) {
        for (let i = 0; i < versions.length - 1; i++) {
          const oldV = versions[i];
          const newV = versions[i + 1];

          const hasOldSuccess = records.some(r => r.L__version === oldV && r.state === 'success');

          if (hasOldSuccess) {
            const key = `${lib}_${oldV}_${newV}`;
            if (!updatesMap.has(key)) {
              const libName = records.find(r => r.L__version === newV)?.L__npm_pkg || records[0].L__npm_pkg;
              updatesMap.set(key, { nameWithOwner: lib, oldVersion: oldV, newVersion: newV, libName });
            }
          }
        }
      }
    }
  }
  return Array.from(updatesMap.values());
}

/**
 * test_result.json から抽出条件を満たすライブラリ名とディレクトリパスの組み合わせを生成
 */
function generateInputData(testResultPath: string): InputData[] {
  const rawData = fs.readFileSync(testResultPath, 'utf-8');
  const parsedData = JSON.parse(rawData);
  const testResults = Array.isArray(parsedData) ? parsedData : [parsedData];

  let targetUpdates = extractUpdatesFromResults(testResults);

  const inputDataList: InputData[] = [];

  for (const update of targetUpdates) {
    const libRecords = testResults.filter(r => r.L__nameWithOwner === update.nameWithOwner);
    if (libRecords.length === 0) continue;

    const clientsGrouped = new Map<string, any[]>();
    for (const record of libRecords) {
      if (!clientsGrouped.has(record.S__nameWithOwner)) clientsGrouped.set(record.S__nameWithOwner, []);
      clientsGrouped.get(record.S__nameWithOwner)!.push(record);
    }

    let hasValidClients = false;
    for (const [client, records] of clientsGrouped.entries()) {
      const hasOldSuccess = records.some(r => r.L__version === update.oldVersion && r.state === "success");
      const hasNewVersion = records.some(r => r.L__version === update.newVersion);

      if (hasOldSuccess && hasNewVersion) {
        hasValidClients = true;
        break;
      }
    }

    if (!hasValidClients) continue;

    const libName = update.libName;
    const cleanVersion = update.newVersion.replace(/[^a-zA-Z0-9]/g, '');
    const baseRepoDir = `../alldataset_clients/${libName}/${cleanVersion}`;

    inputDataList.push({
      failureDir: `${baseRepoDir}/failure`,
      successDir: `${baseRepoDir}/success`,
      libName: libName,
      cleanVersion: cleanVersion,
      preVersion: update.oldVersion,
      postVersion: update.newVersion
    });
  }

  const uniqueInputData = Array.from(new Map(inputDataList.map(item => [item.failureDir, item])).values());
  return uniqueInputData;
}

(async () => {
  const testResultPath = path.resolve(__dirname, '../datasets/test_result.json');
  let inputDataList: InputData[] = [];

  try {
    inputDataList = generateInputData(testResultPath);
  } catch (error) {
    console.error('Error reading or parsing test_result.json:', error);
    return;
  }

  if (inputDataList.length === 0) {
    console.error('Error: No input data generated.');
    return;
  }

  const now = new Date();
  const date = output_json.formatDateTime(now);

  // CSV集計用配列
  const executionStats: ExecutionStat[] = [];
  let idCounter = 1;

  console.log(`Target Libraries Count: ${inputDataList.length}`);

  for (const inputData of inputDataList) {
    const getPatternDir: string = inputData.failureDir;
    const detectPatternDir: string = inputData.successDir;
    const libName: string = inputData.libName;

    // クローンディレクトリが存在するか確認し、ないものはスキップ
    if (!fs.existsSync(path.resolve(__dirname, getPatternDir)) || !fs.existsSync(path.resolve(__dirname, detectPatternDir))) {
      continue;
    }

    // 出力先の準備
    const outputDirName = `${libName}_${inputData.cleanVersion}`;
    let outputDir: string = path.resolve(process.cwd(), '../output/method/' + date + '/' + outputDirName);
    let create_outputDir = outputDir + '/createPattern';
    let detect_outputDir = outputDir + '/detectByPattern';

    output_json.createOutputDirectory(create_outputDir);
    output_json.createOutputDirectory(detect_outputDir);

    console.log(`\n----------- Processing ${libName} (${inputData.cleanVersion}) -----------`);
    let lastpatterns: ExtractFunctionCallsResult[][][] = [];
    let patternAnalyzedCount = 0;

    try {
      // パターン作成
      const createRes = await createOnlyCall(getPatternDir, libName, create_outputDir);
      lastpatterns = createRes.patterns;
      patternAnalyzedCount = createRes.summary.analyzedClients;

      // 追加したヘルパー関数を用いて検出を実行し、検出数等を含む統計結果を受け取る
      console.log('detectPatternDir'+detectPatternDir);
      const statsResult = await support_detectByPatternWithStats(getPatternDir, detectPatternDir, libName, lastpatterns, detect_outputDir, true, 0);
      
      // 各ディレクトリの総数を取得するためのパス
      const totalFailureCount = statsResult.failureResult.scannedDirCount;
      const totalSuccessCount = statsResult.successResult.scannedDirCount;

      // CSV用の統計情報を格納
      executionStats.push({
        id: idCounter++,
        library: libName,
        preVersion: inputData.preVersion,
        postVersion: inputData.postVersion,
        totalFailureDirs: totalFailureCount,
        patternAnalyzedClientsCount: patternAnalyzedCount,
        failureDetectedClientsCount: statsResult.failureResult.totalClients,
        failureValid: statsResult.failureResult.validDetectedCount,
        failureNoTest: statsResult.failureResult.notestCount,
        failureStandard: statsResult.failureResult.standardCount,
        failureNoScript: statsResult.failureResult.noscriptCount,
        failureNoPkg: statsResult.failureResult.noPackagejsonCount,
        createdPatternCount: lastpatterns.length,
        totalSuccessDirs: totalSuccessCount,
        successDetectedClientsCount: statsResult.successResult.totalClients,
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
      // エラーで止まらずに次のリポジトリへ進むための安全措置
      console.error(`Error processing ${libName} (${inputData.cleanVersion}):`, err);
    }

    console.log('--------------------------------------------\n');

    // メモリを解放させるための強制ガベージコレクション
    if (global.gc) {
      global.gc();
    }
  }

  console.log("All tasks completed.");

  // ----------------------------------------
  // CSVファイルの出力処理
  // ----------------------------------------
  if (executionStats.length > 0) {
    const csvDir = path.resolve(process.cwd(), '../output/method'+ '/' + date);
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    // ファイル名に使用できない文字(:や空白)をアンダースコアに置換
    const safeDateForFileName = date.replace(/[: ]/g, '_');
    const csvPath = path.join(csvDir, `execution_summary_${safeDateForFileName}.csv`);

    const csvHeader = 'ID,Library,PreVersion,PostVersion,ClonedFailureCount,PatternAnalyzedClients,CreatedPatternsCount,FailureDetectedCount,FailureValid,FailureNoTest,FailureStandard,FailureNoScript,FailureNoPkg,ClonedSuccessCount,SuccessDetectedCount,SuccessValid,SuccessNoTest,SuccessStandard,SuccessNoScript,SuccessNoPkg,OutputPath\n';

    const csvRows = executionStats.map(stat =>
      `${stat.id},${stat.library},${stat.preVersion},${stat.postVersion},${stat.totalFailureDirs},${stat.patternAnalyzedClientsCount},${stat.createdPatternCount},${stat.failureDetectedClientsCount},${stat.failureValid},${stat.failureNoTest},${stat.failureStandard},${stat.failureNoScript},${stat.failureNoPkg},${stat.totalSuccessDirs},${stat.successDetectedClientsCount},${stat.successValid},${stat.successNoTest},${stat.successStandard},${stat.successNoScript},${stat.successNoPkg},${stat.outputPath}`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf8');
    console.log(`\nExecution Summary CSV Report generated at:\n => ${csvPath}`);
  } else {
    console.log("\nNo valid data processed to generate CSV report.");
  }

})();