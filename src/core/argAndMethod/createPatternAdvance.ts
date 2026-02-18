import fs from 'fs';
import path from "path";
import { useAstAdvance } from "./useAstAdvance";
import { checkAst } from "../../astRelated/base/checkAst";
import { getAllFiles } from "../../utils/getAllFiles";
import { getSubDir } from "../../utils/getSubDir";
import output_json from "../../utils/output_json";
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import patternConversion from '../../patternOperations/patternConversion';
import { processPatterns } from '../methodUnit/processPatterns';
import { countPatterns } from '../../patternOperations/patternCount';
import { DetectionOutputAdvance, PatternCount, integrate_type } from '../../types/OutputTypes';
import patternUtils from '../../patternOperations/patternUtils';

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
export const createPatternAdvance = async (
  patternDir: string,
  libName: string,
  outputDir: string
): Promise<{ rawPattern: ExtractFunctionCallsResult[][][]; convertedPattern: ExtractFunctionCallsResult[][][] }> => {
  let JsonRows: RawJsonRow[] = [];
  let respattern: ExtractFunctionCallsResult[][][] = [];

  const alldirs: string[] = await getSubDir(patternDir);

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

    extract_pattern1 = await useAstAdvance(allFiles, libName, 1);

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

  return { rawPattern: respattern, convertedPattern: lastpatterns };
}

// 既存の呼び出し文情報のみを用いたパターン
export const createOnlyCall = async (patternDir: string, libName: string, outputDir: string): Promise<ExtractFunctionCallsResult[][][]> => {
  let patterns: ExtractFunctionCallsResult[][][] = (await createPatternAdvance(patternDir, libName, outputDir)).rawPattern;
  let strArray: string[][][] = patternConversion.extractFunctionCallCodes(patterns);
  let formattedPattern: string[][][] = []; //統合前に整形をしたパターンが入る

  for (const strSubArray of strArray) {
    const formatted = formatAndIntegratePattern(strSubArray);
    formattedPattern.push(formatted);
  }

  console.log('----------');
  console.log('input len:', strArray.length);
  console.log('after compareElement:', formattedPattern.length);
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), ' strArray'), JSON.stringify(formattedPattern, null, 4), 'utf8');
  //パターンの集約や重複排除
  let lastpatterns = await processPatterns(formattedPattern);
  let mergepattern: PatternCount[] = countPatterns(lastpatterns);

  mergepattern.sort((a, b) => b.count - a.count);
  const totalCount2 = mergepattern.reduce((acc, item) => acc + item.count, 0);
  const output2: integrate_type = { patterns: mergepattern, totalClients: totalCount2 };
  lastpatterns = patternUtils.removeDuplicate(lastpatterns);

  if (mergepattern) {
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'detectpatternlist'), JSON.stringify(output2, null, 4), 'utf8');
  }
  let returnPatterns: ExtractFunctionCallsResult[][][] = patternConversion.restoreExtractFunctionCallsResult(lastpatterns);
  returnPatterns = patternConversion.typeAwareAbstStr(returnPatterns);
  console.log('lastpatterns len:', lastpatterns.length);
  console.log('==================================================');
  return returnPatterns;
}

/**
 * パターンの空白文字を正規化し、重複するパターンを統合・整理する関数
 * @param pattern 処理対象のパターン配列 (string[][])
 * @param mode 重複統合を行うかどうか (1: 行う, それ以外: 行わない)
 * @returns 整形後のパターン配列 (string[][])
 */
export const formatAndIntegratePattern = (
  pattern: string[][],
): string[][] => {
  // 1. 空白・タブ・改行の削除と正規化（全体の配列をmapで一気に処理）
  let formattedPattern = pattern.map(subPattern =>
    subPattern.map(item => item.trim().replace(/\s+/g, ' '))
  );
  let tmp_pattern = JSON.parse(JSON.stringify(formattedPattern));
  // クライアント内でのパターンの重複統合
  let indicesToRemove: number[] = [];
  // 一致するインデックスのペアを調査
  for (let j = 0; j < tmp_pattern.length; j++) {
    for (let k = j + 1; k < tmp_pattern.length; k++) {
      if (isCompareElement(tmp_pattern[j], tmp_pattern[k])) {
        if (tmp_pattern[j].length > tmp_pattern[k].length) {
          indicesToRemove.push(k);
        } else {
          indicesToRemove.push(j);
        }
      }
    }
  }

  // 後ろから削除しないとインデックスがずれるため，削除するインデックスを降順にソートし、重複を排除
  indicesToRemove.sort((a, b) => b - a);
  indicesToRemove = [...new Set(indicesToRemove)];

  // 要素の削除
  if (indicesToRemove.length > 0) {
    for (const index of indicesToRemove) {
      formattedPattern.splice(index, 1);
    }
  }
  // ---dの順番を整形
  formattedPattern = patternUtils.alignNumbersInPattern(formattedPattern).after;
  return formattedPattern;
};

function isCompareElement(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    let long: string[] = [];
    let short: string[] = [];
    if (arr1.length < arr2.length) {
      long = arr2;
      short = arr1;
    } else {
      long = arr1;
      short = arr2;
    }
    if (isEqualCheck(short, long)) {
      return true;
    }
  } else {
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }
  return false;
}

function isEqualCheck(short: string[], long: string[]): boolean {
  let judge: boolean[] = [];
  for (let i = 0; i < short.length; i++) {
    judge.push(false);
  }
  for (let i = 0; i < short.length; i++) {
    for (let j = 0; j < long.length; j++) {
      if (short[i] === long[j]) {
        judge[i] = true;
        break;
      }
    }
  }
  return judge.every(val => val);
}