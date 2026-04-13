import fs from 'fs';
import path from "path";
import { useAst } from "./useAst";
import { checkAst } from "../astRelated/base/checkAst";
import { getAllFiles } from "../utils/getAllFiles";
import { getSubDir } from "../utils/getSubDir";
import output_json from "../utils/output_json";
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
import patternConversion from '../patternOperations/patternConversion';
import { processPatterns } from './processPatterns';
import { countPatterns } from '../patternOperations/patternCount';
import { DetectionOutput, PatternCount, PatternCount_old, integrate_type } from '../types/OutputTypes';
import patternUtils from '../patternOperations/patternUtils';

interface RawJsonRow {
  failureclient: string;
  detectPatterns: ExtractFunctionCallsResult[][];
}

/**
 * ASTを用いて型情報を考慮した関数呼び出しのパターンを抽出・変換する。
 * @param patternDir データセットの入力ディレクトリ
 * @param libName 対象ライブラリ名
 * @param outputDir 出力先ディレクトリ
 * @returns 変換前のパターン(rawPattern)と変換後のパターン(convertedPattern)を含むオブジェクト
 */
export const createPattern = async (
  patternDir: string,
  libName: string,
  outputDir: string
): Promise<{ rawPattern: ExtractFunctionCallsResult[][][]; convertedPattern: ExtractFunctionCallsResult[][][]; stats: { totalClients: number, validClients: number } }> => {
  let JsonRows: RawJsonRow[] = [];
  let respattern: ExtractFunctionCallsResult[][][] = [];

  const alldirs: string[] = await getSubDir(patternDir);
  let validClientsCount = 0;

  for (const subdir of alldirs) {
    let extract_pattern1: ExtractFunctionCallsResult[][] = [];
    let judge: boolean = true;
    const allFiles: string[] = await getAllFiles(subdir);

    for (const file of allFiles) {
      if (await checkAst(file) === false) {
        judge = false;
        break;
      }
    }
    if (judge === false) {
      continue;
    }

    validClientsCount++;

    extract_pattern1 = await useAst(allFiles, libName, 1);

    if (extract_pattern1.length > 0) {
      const hasContent = extract_pattern1.some(fileResult => fileResult.length > 0);
      let flag = false;
      for (const pattern of extract_pattern1) {
        if (pattern.length > 1) flag = true;
      }

      if (hasContent && flag) {
        JsonRows.push({
          failureclient: subdir,
          detectPatterns: extract_pattern1
        });
        respattern.push(extract_pattern1);
      }
    }
  }

  const outputPath = output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'rawpattern');
  fs.writeFileSync(outputPath, JSON.stringify(JsonRows, null, 4), 'utf8');

  // 変換後パターンの作成
  const lastpatterns: ExtractFunctionCallsResult[][][] = patternConversion.typeAwareAbstStr(respattern);
  const outputPath2 = output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'patternList');
  fs.writeFileSync(outputPath2, JSON.stringify(lastpatterns, null, 4), 'utf8');

  console.log('========== createPattern (Raw Output) ============');
  console.log('failure alldirs:', alldirs.length);
  console.log('make failure pattern (clients):', respattern.length);
  console.log('Raw Output saved to:', outputPath);
  console.log('pattern:', outputPath2);
  console.log('==================================================');

  return { rawPattern: respattern, convertedPattern: lastpatterns, stats: { totalClients: alldirs.length, validClients: validClientsCount } };
}

// 既存の呼び出し文情報のみを用いたパターン
export const createOnlyCall = async (patternDir: string, libName: string, outputDir: string): Promise<{ patterns: ExtractFunctionCallsResult[][][], summary: { totalClients: number, analyzedClients: number, finalPatternCount: number } }> => {
  const createResult = await createPattern(patternDir, libName, outputDir);
  let patterns: ExtractFunctionCallsResult[][][] = createResult.rawPattern;
  const stats = createResult.stats;
  
  let strArray: string[][][] = patternConversion.extractFunctionCallCodes(patterns);
  let formattedPattern: string[][][] = []; //統合前に整形をしたパターンが入る

  for (const strSubArray of strArray) {
    const formatted = patternConversion.formatAndIntegratePattern(strSubArray);
    formattedPattern.push(formatted);
  }

  console.log('----------');
  console.log('input len:', strArray.length);
  console.log('after compareElement:', formattedPattern.length);
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), ' strArray'), JSON.stringify(formattedPattern, null, 4), 'utf8');
  //パターンの集約や重複排除
  let lastpatterns = await processPatterns(formattedPattern);
  let mergepattern: PatternCount_old[] = countPatterns(lastpatterns);

  mergepattern.sort((a, b) => b.count - a.count);
  const totalCount2 = mergepattern.reduce((acc, item) => acc + item.count, 0);
  const output2: integrate_type = { patterns: mergepattern, totalClients: totalCount2 };
  lastpatterns = patternUtils.removeDuplicate(lastpatterns);

  let returnPatterns: ExtractFunctionCallsResult[][][] = patternConversion.restoreExtractFunctionCallsResult(lastpatterns);
  returnPatterns = patternConversion.typeAwareAbstStr(returnPatterns);

  const summary = {
    totalClients: stats.totalClients,
    analyzedClients: stats.validClients,
    finalPatternCount: returnPatterns.length
  };

  if (mergepattern) {
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'pattern_creation_summary'), JSON.stringify(summary, null, 4), 'utf8');
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'detectpatternlist'), JSON.stringify(returnPatterns, null, 4), 'utf8');
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'integrated_pattern'), JSON.stringify(output2, null, 4), 'utf8');
  }
  console.log('lastpatterns len:', lastpatterns.length);
  console.log('==================================================');
  
  return { patterns: returnPatterns, summary };
}