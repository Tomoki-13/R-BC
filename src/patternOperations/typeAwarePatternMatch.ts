import patternConversion from "./patternConversion";
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";

/**
 * 型情報を考慮したパターンマッチング関数
 * @param {ExtractFunctionCallsResult[][]} detectionTargets 解析済みのソースコードデータ (ファイル単位の配列の配列)
 * @param {ExtractFunctionCallsResult[][][]} detectionPatterns 検出に用いるパターンのリスト
 * @param {number} mode マッチングモード (0: コードのみ, 1: +型情報, 2: +値情報)
 * @returns {Promise<[boolean, ExtractFunctionCallsResult[][] | null]>}
 */
export const typeAwarePatternMatch = async (
  detectionTargets: ExtractFunctionCallsResult[][],
  detectionPatterns: ExtractFunctionCallsResult[][][],
  mode: number = 1
): Promise<[boolean, ExtractFunctionCallsResult[][] | null]> => {
  let searchCandidates: ExtractFunctionCallsResult[][][] = JSON.parse(JSON.stringify(detectionPatterns));

  try {
    for (const currentPattern of searchCandidates) {

      const patternVariables: {
        [key: string]: {
          code: string,
          types: string[][],
          context: string[][]
        }[]
      } = {};

      for (const blockGroup of currentPattern) {
        for (const block of blockGroup) {
          const str = block.FunctionCallCode;
          const match = str.match(/variable(\d+)/g);

          if (match) {
            const varKey = match[0];
            if (!patternVariables[varKey]) {
              patternVariables[varKey] = [];
            }
            patternVariables[varKey].push({
              code: str,
              types: block.argTypes || [],
              context: block.argContexts || []
            });
          }
        }
      }

      const foundVariablesStatus: { [key: string]: boolean } = {};
      const variableKeys = Object.keys(patternVariables);
      variableKeys.forEach(key => foundVariablesStatus[key] = false);

      for (const fileDataBlocks of detectionTargets) {

        if (Object.values(foundVariablesStatus).every(status => status === true)) {
          return [true, currentPattern];
        }

        const flatFileData = fileDataBlocks.map(block => ({
          code: block.FunctionCallCode,
          types: block.argTypes || [],
          context: block.argContexts || []
        }));

        const patternVariablesInFile = JSON.parse(JSON.stringify(patternVariables));

        for (const key of variableKeys) {
          if (foundVariablesStatus[key]) {
            continue;
          }

          const defCode = patternVariablesInFile[key][0].code;
          let regexDef: RegExp;

          if (defCode.includes(`(?<${key}>`)) {
            regexDef = new RegExp(defCode);
          } else {
            const escaped = patternConversion.escapeFunc(defCode);
            const patternRegexStr = escaped.replace(new RegExp(key, 'g'), `(?<${key}>[\\w$]+)`);
            regexDef = new RegExp(patternRegexStr);
          }

          console.log(`[DEBUG] Checking Definition for ${key}. Regex: ${regexDef.source}`);

          let definitionMatch: RegExpMatchArray | null = null;
          let definitionIndex: number = 0;

          for (let i = 0; i < flatFileData.length; i++) {
            definitionMatch = flatFileData[i].code.match(regexDef);

            // console.log("flatFileData[i].code",flatFileData[i].code);
            // console.log(`regexDef`, regexDef);
            // console.log(`definitionMatch`, definitionMatch);

            definitionIndex = i + 1;
            if (definitionMatch) break;
          }

          if (definitionMatch && definitionMatch.groups) {
            const actualVarName = definitionMatch.groups[key];
            console.log(`[DEBUG] Definition MATCHED. Captured Variable: ${actualVarName}`);

            for (const otherKey in patternVariablesInFile) {
              for (let i = 0; i < patternVariablesInFile[otherKey].length; i++) {
                if (!(otherKey === key && i === 0)) {
                  patternVariablesInFile[otherKey][i].code =
                    patternVariablesInFile[otherKey][i].code.replace(key, actualVarName);
                }
              }
            }

            if (patternVariablesInFile[key].length === 1) {
              foundVariablesStatus[key] = true;
              console.log(`[DEBUG] ${key} is definition-only pattern. Status: TRUE`);
              continue;
            }

            let allUsagesMatched = false;

            for (let i = 1; i < patternVariablesInFile[key].length; i++) {
              let usagePatternCode = patternVariablesInFile[key][i].code;
              const usageRegex = new RegExp(patternConversion.escapeFunc(usagePatternCode));
              let matched = false;

              console.log(`[DEBUG] Checking Usage [${i}] for ${key}. Pattern: ${usagePatternCode}`);

              for (let j = definitionIndex; j < flatFileData.length; j++) {
                const userData = flatFileData[j];

                let normalizedCode = userData.code.replace(/[\r\n]/g, '');
                normalizedCode = normalizedCode.replace(/\[[^\]]*\]/g, 'argument');
                normalizedCode = normalizedCode.replace(/\{[^}]*\}/g, 'argument');

                const usageMatch = normalizedCode.match(usageRegex);

                // console.log(`usageRegex`, usageRegex);
                // console.log(`normalizedCode`, normalizedCode);

                if (usageMatch) {
                  console.log(`  [DEBUG] String matched at line ${j + 1}: "${userData.code}"`);

                  // mode 0: コードのみ
                  if (mode === 0) {
                    matched = true;
                    break;
                  }

                  // mode 1: +型情報
                  let isTypeMatched = true;
                  if (mode >= 1) {
                    const userTypes = userData.types;
                    const expectedTypes = patternVariablesInFile[key][i].types;

                    console.log(`  [DEBUG] Checking Types. User: ${JSON.stringify(userTypes)} vs Expected: ${JSON.stringify(expectedTypes)}`);

                    if (userTypes.length !== expectedTypes.length) {
                      console.log(`  [DEBUG] Type Mismatch: Length differs`);
                      isTypeMatched = false;
                    } else {
                      for (let k = 0; k < expectedTypes.length; k++) {
                        if (JSON.stringify(userTypes[k].sort()) !== JSON.stringify(expectedTypes[k].sort())) {
                          console.log(`  [DEBUG] Type Mismatch at arg ${k}: ${userTypes[k]} != ${expectedTypes[k]}`);
                          isTypeMatched = false;
                          break;
                        }
                      }
                    }
                  }

                  // mode 2: +値情報
                  let isValueMatched = true;
                  if (mode >= 2 && isTypeMatched) {
                    // ADD: argContextsの比較ロジックを実装
                  }

                  if (isTypeMatched && isValueMatched) {
                    console.log(`  [DEBUG] Match Confirmed!`);
                    matched = true;
                    break;
                  }
                }
              }

              if (!matched) {
                console.log(`[DEBUG] Usage [${i}] NOT found.`);
                allUsagesMatched = false;
                break;
              }

              if (i === patternVariablesInFile[key].length - 1) {
                allUsagesMatched = true;
              }
            }

            if (allUsagesMatched) {
              console.log(`[DEBUG] All usages matched for ${key}. Status: TRUE`);
              foundVariablesStatus[key] = true;
            }
          }
        }
      }

      if (Object.values(foundVariablesStatus).every(status => status === true)) {
        return [true, currentPattern];
      }
    }
  } catch (err) {
    console.error('Error typeAwarePatternMatch:', err);
  }
  return [false, null];
};


// ==========================================
// 動作検証用コード (Main)
// ==========================================
if (require.main === module) {
  (async () => {
    console.log("--- 動作検証開始 ---");

    // 1. 検出パターン (targetPattern をベースに修正)
    // 正規表現に require\('...' という形で括弧をエスケープして追加
    const samplePatterns: ExtractFunctionCallsResult[][][] = [[
      [
        {
          FunctionCallCode: "(?<variable1>[\\w-]+) = require\\([\"'`]fs[\"'`]\\)[^.]*",
          filePath: 'pattern_def', // 必須: ダミー
          line: 0,                 // 必須: ダミー
          argTypes: [[]],
          argContexts: [[]]
        },
        {
          FunctionCallCode: "variable1([^,]*,[^,]*)[^.]*",
          filePath: 'pattern_usage', // 必須: ダミー
          line: 0,                   // 必須: ダミー
          argTypes: [['String'], ['String']],
          argContexts: [[]]
        }
      ]
    ]];

    // 2. 検出対象データ (成功ケース)
    const sampleTargetsSuccess: ExtractFunctionCallsResult[][] = [
      [
        {
          FunctionCallCode: "const fs = require('fs')",
          filePath: 'success_case.js',
          line: 1,
          argTypes: [[]],
          argContexts: [[]]
        },
        {
          FunctionCallCode: "fs('file.txt', 'content')",
          filePath: 'success_case.js',
          line: 2,
          argTypes: [['String'], ['String']],
          argContexts: [[]]
        }
      ]
    ];

    console.log("検証1: Mode 1 (型チェックあり) - 成功ケース");
    const [resultSuccess, matchedPatternSuccess] = await typeAwarePatternMatch(sampleTargetsSuccess, samplePatterns, 1);
    console.log(`結果: ${resultSuccess}`); // true
    if (resultSuccess) {
      console.log("検出成功");
    } else {
      console.error("予期せぬ失敗");
    }

    // 3. 検出対象データ (失敗ケース)
    const sampleTargetsFail: ExtractFunctionCallsResult[][] = [
      [
        {
          FunctionCallCode: "const fs = require('fs')",
          filePath: 'fail_case.js',
          line: 1,
          argTypes: [[]],
          argContexts: [[]]
        },
        {
          FunctionCallCode: "fs('file.txt', 12345)",
          filePath: 'fail_case.js',
          line: 2,
          argTypes: [['String'], ['Number']],
          argContexts: [[]]
        }
      ]
    ];

    console.log("\n検証2: Mode 1 (型チェックあり) - 失敗ケース");
    const [resultFail] = await typeAwarePatternMatch(sampleTargetsFail, samplePatterns, 1);
    console.log(`結果: ${resultFail}`); // false

    console.log("--- 動作検証終了 ---");
  })();
}