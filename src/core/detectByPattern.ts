import fs from 'fs';
import path from "path";
import crypto from 'crypto';

import { getAllFiles } from "../utils/getAllFiles";
import { getSubDir } from "../utils/getSubDir";
import { jsonconfStr } from "../utils/jsonconf";
import output_json from "../utils/output_json";
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
import { useAst } from "./useAst";
import { typeAwarePatternMatch } from "../patternOperations/typeAwarePatternMatch";
import { MatchClientPattern, PatternCount } from '../types/OutputTypes';
import { DetectionOutput, integrate_type } from '../types/OutputTypes';

// パターンの出現回数をカウント
const countPatterns = (patterns: ExtractFunctionCallsResult[][][]): PatternCount[] => {
  const counts: { [key: string]: { pattern: ExtractFunctionCallsResult[][], count: number } } = {};

  for (const pattern of patterns) {
    const str = JSON.stringify(pattern);
    // 32文字の短いハッシュをキーにする
    const key = crypto.createHash('md5').update(str).digest('hex');

    if (counts[key]) {
      counts[key].count++;
    } else {
      counts[key] = {
        pattern: pattern,
        count: 1
      };
    }
  }
  return Object.values(counts).sort((a, b) => b.count - a.count);
};

const combinePatterns = (arr1: PatternCount[], arr2: PatternCount[]): PatternCount[] => {
  const combinedMap: { [key: string]: PatternCount } = {};

  const addToMap = (arr: PatternCount[]) => {
    for (const item of arr) {
      const str = JSON.stringify(item.pattern);
      const key = crypto.createHash('md5').update(str).digest('hex');

      if (combinedMap[key]) {
        combinedMap[key].count += item.count;
      } else {
        combinedMap[key] = { pattern: item.pattern, count: item.count };
      }
    }
  };

  addToMap(arr1);
  addToMap(arr2);

  return Object.values(combinedMap).sort((a, b) => b.count - a.count);
};

export type ExtendedDetectionOutput = DetectionOutput & {
  scannedDirCount: number;
  notestCount: number;
  standardCount: number;
  noscriptCount: number;
  noPackagejsonCount: number;
  validDetectedCount: number;
};

// 単一検出 dup = false , 重複検出 dup = true
// mode 0: コードのみ（型情報なし）
// mode 1: コード + 型の完全一致（"object" は "object" とのみ一致）
// mode 2: コード + 型一致 + object キー部分一致（"object:{key}" は上位キーを持つターゲットにもマッチ）
// mode 3: TODO:object キー名 + 値の型まで確認
// mode 4: TODO:実際の値まで確認
export const detectByPattern = async (
  matchDir: string,
  libName: string,
  detectPattern: ExtractFunctionCallsResult[][][],
  outputDir: string,
  dup: boolean = false,
  mode: number = 1,
): Promise<ExtendedDetectionOutput> => {
  let notest: number = 0;
  let standard: number = 0;
  let noscript: number = 0;
  let noPackagejson: number = 0;

  let matchClientPatternJson: MatchClientPattern[] = [];
  let countmatchedpatterns: ExtractFunctionCallsResult[][][] = [];
  let sumDetectClient: number = 0;
  let detectedClientNames: string[] = [];

  /** 全クライアントの生AST結果（検出有無にかかわらず） */
  type ClientRawEntry = {
    client: string;
    detected: boolean;
    usesLibrary: boolean;  // ライブラリの import/require が見つかったか
    testStatus: string;
    pattern: ExtractFunctionCallsResult[];
  };
  const allClientRaw: ClientRawEntry[] = [];

  const matchAlldirs: string[] = await getSubDir(matchDir);
  const totalDirs = matchAlldirs.length;

  for (let i = 0; i < totalDirs; i++) {
    const subdir = matchAlldirs[i];

    // JSON出力用に、matchDirからの相対パスを生成（フルパスを出力させない）
    const relativeClientPath = path.relative(matchDir, subdir);

    const progress = (((i + 1) / totalDirs) * 100).toFixed(1);
    process.stdout.write(`\r[${path.basename(matchDir)}] Progress: ${progress}% (${i + 1}/${totalDirs})`);

    let test: string = jsonconfStr(subdir);

    const allFiles: string[] = await getAllFiles(subdir);
    // ASTベースの解析
    const raw_extract_pattern: ExtractFunctionCallsResult[][] = await useAst(allFiles, libName, 0);
    const usesLibrary = raw_extract_pattern.length > 0;
    let wasDetected = false;

    if (usesLibrary) {
      if (dup === false) {
        // 単一検出: 最初にマッチしたパターンのみ採用
        // TODO: 重複検出を考慮して同じ関数内で完結させたい

        const [isMatch, matchedPattern] = await typeAwarePatternMatch(raw_extract_pattern, detectPattern, mode);

        if (isMatch && matchedPattern) {
          matchClientPatternJson.push({
            client: relativeClientPath,
            pattern: raw_extract_pattern.flat(),
            detectPattern: matchedPattern
          });
          countmatchedpatterns.push(matchedPattern);

          if (test === 'standard') standard++;
          else if (test === 'no test') notest++;
          else if (test === 'no scripts') noscript++;
          else if (test === 'noPackage.json') noPackagejson++;

          sumDetectClient++;
          detectedClientNames.push(relativeClientPath);
          wasDetected = true;
        }

      } else if (dup === true) {
        // 重複検出
        const matchedPatternsInClient: ExtractFunctionCallsResult[][][] = [];

        for (const singlePattern of detectPattern) {
          const [isMatch, matched] = await typeAwarePatternMatch(raw_extract_pattern, [singlePattern], mode);
          if (isMatch && matched) {
            matchedPatternsInClient.push(matched);
          }
        }

        if (matchedPatternsInClient.length > 0) {
          for (const matched of matchedPatternsInClient) {
            matchClientPatternJson.push({
              client: relativeClientPath,
              pattern: raw_extract_pattern.flat(),
              detectPattern: matched
            });
            countmatchedpatterns.push(matched);
          }

          if (test === 'standard') standard++;
          else if (test === 'no test') notest++;
          else if (test === 'no scripts') noscript++;
          else if (test === 'noPackage.json') noPackagejson++;

          sumDetectClient++;
          detectedClientNames.push(relativeClientPath);
          wasDetected = true;
        }
      }
    }

    // 検出有無にかかわらず全クライアントの生パターンを記録
    allClientRaw.push({
      client: relativeClientPath,
      detected: wasDetected,
      usesLibrary,
      testStatus: test,
      pattern: raw_extract_pattern.flat(),
    });
  }

  process.stdout.write('\n');
  const detectedUserPattern = countPatterns(countmatchedpatterns);
  const validDetectedCount = sumDetectClient - (notest + standard + noscript + noPackagejson);

  const output: ExtendedDetectionOutput = {
    patterns: detectedUserPattern,
    totalClients: sumDetectClient,
    detectedClients: detectedClientNames,
    scannedDirCount: totalDirs,
    notestCount: notest,
    standardCount: standard,
    noscriptCount: noscript,
    noPackagejsonCount: noPackagejson,
    validDetectedCount: validDetectedCount
  };

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(matchDir), 'matchResults'), JSON.stringify(matchClientPatternJson, null, 2), 'utf8');

  // 全クライアントの生AST結果を保存（検出有無問わず）
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(matchDir), 'allRaw'), JSON.stringify(allClientRaw, null, 2), 'utf8');

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(matchDir), 'detect'), JSON.stringify(output, null, 2), 'utf8');
  if (matchDir.includes('success')) {
    console.log('============detect success==========');
  } else if (matchDir.includes('failure')) {
    console.log('============detect failure==========');
  } else {
    console.log('============================');
  }
  console.log('matchDir:', matchDir);
  console.log('detectedUsedPatternTypes:', detectedUserPattern.length);
  console.log(`nopackage.json: ${noPackagejson} noscript: ${noscript} notest: ${notest} standard or eslint: ${standard} valid: ${output.validDetectedCount}`);
  console.log('alldirs:', matchAlldirs.length);
  console.log('sumDetectClient:', sumDetectClient);
  console.log('=================================');

  return output;
}

// mode 0: コードのみ / mode 1: 型の完全一致 / mode 2: object キー部分一致 / mode 3,4: 将来実装
export const support_detectByPattern = async (
  failureDir: string,
  successDir: string,
  libName: string,
  detectPattern: ExtractFunctionCallsResult[][][],
  outputDir: string,
  dup: boolean = true,
  mode: number = 1,
): Promise<PatternCount[]> => {
  const failureResult = await detectByPattern(failureDir, libName, detectPattern, outputDir, dup, mode);
  const successResult = await detectByPattern(successDir, libName, detectPattern, outputDir, dup, mode);

  const combineClient = combinePatterns(failureResult.patterns, successResult.patterns);

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(failureDir), 'detect'), JSON.stringify(failureResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir), 'detect'), JSON.stringify(successResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir + 'combine'), 'preCount'), JSON.stringify(combineClient, null, 2), 'utf8');

  return combineClient;
}

// 全回し用
export const support_detectByPatternWithStats = async (
  failureDir: string,
  successDir: string,
  libName: string,
  detectPattern: ExtractFunctionCallsResult[][][],
  outputDir: string,
  dup: boolean = true,
  mode: number = 1,
): Promise<{ combineClient: PatternCount[], failureResult: ExtendedDetectionOutput, successResult: ExtendedDetectionOutput }> => {
  // それぞれの検出を実行し、戻り値(DetectionOutput)を保持
  const failureResult = await detectByPattern(failureDir, libName, detectPattern, outputDir, dup, mode);
  const successResult = await detectByPattern(successDir, libName, detectPattern, outputDir, dup, mode);

  const combineClient = combinePatterns(failureResult.patterns, successResult.patterns);

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(failureDir), 'detect'), JSON.stringify(failureResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir), 'detect'), JSON.stringify(successResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir + 'combine'), 'preCount'), JSON.stringify(combineClient, null, 2), 'utf8');

  // CSVに必要な検出結果情報をまとめて返す
  return { combineClient, failureResult, successResult };
}