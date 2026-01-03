import fs from 'fs';
import path from "path";
import { getAllFiles } from "../../utils/getAllFiles";
import { getSubDir } from "../../utils/getSubDir";
import { jsonconfStr } from "../../utils/jsonconf";
import output_json from "../../utils/output_json";
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import { useAstAdvance } from "./useAstAdvance";
import { typeAwarePatternMatch } from "../../patternOperations/typeAwarePatternMatch";
import { MatchClientPatternAdvance, PatternCountAdvance, DetectionOutputAdvance } from '../../types/Advance';

// パターンの出現回数をカウント (Objectの比較用にJSON文字列化を使用)
const countPatternsAdvance = (patterns: ExtractFunctionCallsResult[][][]): PatternCountAdvance[] => {
  const counts: { [key: string]: { pattern: ExtractFunctionCallsResult[][], count: number } } = {};

  for (const pattern of patterns) {
    const key = JSON.stringify(pattern);
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

const combinePatternsAdvance = (arr1: PatternCountAdvance[], arr2: PatternCountAdvance[]): PatternCountAdvance[] => {
    const combinedMap: { [key: string]: PatternCountAdvance } = {};

    const addToMap = (arr: PatternCountAdvance[]) => {
        for (const item of arr) {
            const key = JSON.stringify(item.pattern);
            if (combinedMap[key]) {
                combinedMap[key].count += item.count;
            } else {
                combinedMap[key] = { ...item };
            }
        }
    };

    addToMap(arr1);
    addToMap(arr2);

    return Object.values(combinedMap).sort((a, b) => b.count - a.count);
};

// 単一検出 mode = 0 , 重複検出 mode = 1
export const detectByPatternAdvance = async (
  matchDir: string, 
  libName: string, 
  detectPattern: ExtractFunctionCallsResult[][][], 
  outputDir: string, 
  mode: number = 0
): Promise<DetectionOutputAdvance> => {
  let notest: number = 0;
  let standard: number = 0;
  let noscript: number = 0;
  let noPackagejson: number = 0;

  let matchClientPatternJson: MatchClientPatternAdvance[] = [];
  let countmatchedpatterns: ExtractFunctionCallsResult[][][] = [];
  let sumDetectClient: number = 0;

  const matchAlldirs: string[] = await getSubDir(matchDir);

  for (const subdir of matchAlldirs) {
    let test: string = jsonconfStr(subdir);
    
    // useAstAdvance を mode=0 (生データ) で呼び出し
    const allFiles: string[] = await getAllFiles(subdir);
    const raw_extract_pattern: ExtractFunctionCallsResult[][] = await useAstAdvance(allFiles, libName, 0);
    
    // typeAwarePatternMatch は1次元配列を受け取るため flat 化して渡す
    const flat_user_code: ExtractFunctionCallsResult[] = raw_extract_pattern.flat();

    if (flat_user_code.length > 0) {
      if (mode === 0) {
        // 単一検出: 最初にマッチしたパターンのみ採用
        const [isMatch, matchedPattern] = await typeAwarePatternMatch(flat_user_code, detectPattern);
        
        if (isMatch && matchedPattern) {
          matchClientPatternJson.push({
            client: subdir,
            pattern: flat_user_code,
            detectPattern: matchedPattern
          });
          countmatchedpatterns.push(matchedPattern);
          
          if (test === 'standard') standard++;
          else if (test === 'no test') notest++;
          else if (test === 'no scripts') noscript++;
          else if (test === 'noPackage.json') noPackagejson++;
          
          sumDetectClient++;
        }

      } else if (mode === 1) {
        // 重複検出: 全ての検出パターン候補を個別に確認
        const matchedPatternsInClient: ExtractFunctionCallsResult[][][] = [];

        for (const singlePattern of detectPattern) {
            const [isMatch, matched] = await typeAwarePatternMatch(flat_user_code, [singlePattern]);
            if (isMatch && matched) {
                matchedPatternsInClient.push(matched);
            }
        }

        if (matchedPatternsInClient.length > 0) {
          for (const matched of matchedPatternsInClient) {
              matchClientPatternJson.push({
                client: subdir,
                pattern: flat_user_code,
                detectPattern: matched
              });
              countmatchedpatterns.push(matched);
          }
          
          if (test === 'standard') standard++;
          else if (test === 'no test') notest++;
          else if (test === 'no scripts') noscript++;
          else if (test === 'noPackage.json') noPackagejson++;
          
          sumDetectClient++;
        }
      }
    }
  }

  const detectedUserPattern = countPatternsAdvance(countmatchedpatterns);
  const output: DetectionOutputAdvance = { patterns: detectedUserPattern, totalClients: sumDetectClient };

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(matchDir), 'matchResults'), JSON.stringify(matchClientPatternJson, null, 2), 'utf8');

  if (matchDir.includes('success')) {
    console.log('============detect success==========');
  } else if (matchDir.includes('failure')) {
    console.log('============detect failure==========');
  } else {
    console.log('============================');
  }
  console.log('matchDir:', matchDir);
  console.log('detectedUsedPatternTypes:', detectedUserPattern.length);
  console.log(`nopackage.json: ${noPackagejson} noscript: ${noscript} notest: ${notest} standard or eslint: ${standard}`);
  console.log('alldirs:', matchAlldirs.length);
  console.log('sumDetectClient:', sumDetectClient);
  console.log('=================================');
  
  return output;
}

export const support_detectByPatternAdvance = async (
  failureDir: string,
  successDir: string,
  libName: string,
  detectPattern: ExtractFunctionCallsResult[][][],
  outputDir: string
): Promise<PatternCountAdvance[]> => {
  // テスト失敗/成功それぞれからパターン検出 (mode=1: 重複検出)
  const failureResult = await detectByPatternAdvance(failureDir, libName, detectPattern, outputDir, 1);
  const successResult = await detectByPatternAdvance(successDir, libName, detectPattern, outputDir, 1);
  
  const combineClient = combinePatternsAdvance(failureResult.patterns, successResult.patterns);
  
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(failureDir), 'detect'), JSON.stringify(failureResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir), 'detect'), JSON.stringify(successResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir + 'combine'), 'preCount'), JSON.stringify(combineClient, null, 2), 'utf8');
  
  return combineClient;
}