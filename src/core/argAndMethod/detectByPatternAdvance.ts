import fs from 'fs';
import path from "path";
import { getAllFiles } from "../../utils/getAllFiles";
import { getSubDir } from "../../utils/getSubDir";
import { jsonconfStr } from "../../utils/jsonconf";
import output_json from "../../utils/output_json";
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import { useAstAdvance } from "./useAstAdvance";
import { typeAwarePatternMatch } from "../../patternOperations/typeAwarePatternMatch";
import { MatchClientPatternAdvance, PatternCountAdvance } from '../../types/Advance';
import { DetectionOutputAdvance, integrate_type } from '../../types/OutputTypes';
// パターンの出現回数をカウント
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

// 単一検出 dup = falese , 重複検出 dup = true
// mode 0: 型情報を考慮しないマッチング，mode 1: 型情報を考慮したマッチング
export const detectByPatternAdvance = async (
  matchDir: string, 
  libName: string, 
  detectPattern: ExtractFunctionCallsResult[][][], 
  outputDir: string, 
  dup: boolean = false,
  mode : number = 1,
): Promise<DetectionOutputAdvance> => {
  let notest: number = 0;
  let standard: number = 0;
  let noscript: number = 0;
  let noPackagejson: number = 0;

  let matchClientPatternJson: MatchClientPatternAdvance[] = [];
  let countmatchedpatterns: ExtractFunctionCallsResult[][][] = [];
  let sumDetectClient: number = 0;
  let detectedClientNames: string[] = [];

  const matchAlldirs: string[] = await getSubDir(matchDir);

  for (const subdir of matchAlldirs) {
    let test: string = jsonconfStr(subdir);
    
    const allFiles: string[] = await getAllFiles(subdir);
    // ASTベースの解析
    const raw_extract_pattern: ExtractFunctionCallsResult[][] = await useAstAdvance(allFiles, libName, 0);
    if (raw_extract_pattern.length > 0) {
      if (dup === false) {
        // 単一検出: 最初にマッチしたパターンのみ採用
        // TODO: 重複検出を考慮して同じ関数内で完結させたい
        
        const [isMatch, matchedPattern] = await typeAwarePatternMatch(raw_extract_pattern, detectPattern, mode);
        
        if (isMatch && matchedPattern) {
          matchClientPatternJson.push({
            client: subdir,
            pattern: raw_extract_pattern.flat(),
            detectPattern: matchedPattern
          });
          countmatchedpatterns.push(matchedPattern);
          
          if (test === 'standard') standard++;
          else if (test === 'no test') notest++;
          else if (test === 'no scripts') noscript++;
          else if (test === 'noPackage.json') noPackagejson++;
          
          sumDetectClient++;
          detectedClientNames.push(subdir);
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
                client: subdir,
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
          detectedClientNames.push(subdir);
        }
      }
    }
  }

  const detectedUserPattern = countPatternsAdvance(countmatchedpatterns);
  const output: DetectionOutputAdvance = { patterns: detectedUserPattern, totalClients: sumDetectClient ,detectedClients: detectedClientNames};

  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(matchDir), 'matchResults'), JSON.stringify(matchClientPatternJson, null, 2), 'utf8');

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
  console.log(`nopackage.json: ${noPackagejson} noscript: ${noscript} notest: ${notest} standard or eslint: ${standard}`);
  console.log('alldirs:', matchAlldirs.length);
  console.log('sumDetectClient:', sumDetectClient);
  console.log('=================================');
  
  return output;
}

//　mode 0: 型情報を考慮しないマッチング，mode 1: 型情報を考慮したマッチング
export const support_detectByPatternAdvance = async (
  failureDir: string,
  successDir: string,
  libName: string,
  detectPattern: ExtractFunctionCallsResult[][][],
  outputDir: string,
  dup: boolean = true,
  mode : number = 1,
): Promise<PatternCountAdvance[]> => {
  const failureResult = await detectByPatternAdvance(failureDir, libName, detectPattern, outputDir, dup, mode);
  const successResult = await detectByPatternAdvance(successDir, libName, detectPattern, outputDir, dup, mode);

  const combineClient = combinePatternsAdvance(failureResult.patterns, successResult.patterns);
  
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(failureDir), 'detect'), JSON.stringify(failureResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir), 'detect'), JSON.stringify(successResult, null, 2), 'utf8');
  fs.writeFileSync(output_json.getUniqueOutputPath(outputDir, path.basename(successDir + 'combine'), 'preCount'), JSON.stringify(combineClient, null, 2), 'utf8');
  
  return combineClient;
}