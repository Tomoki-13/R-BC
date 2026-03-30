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

          let patternRegexStr = patternConversion.escapeFunc(defCode);

          if (!patternRegexStr.includes(`(?<${key}>`)) {
            patternRegexStr = patternRegexStr.replace(new RegExp(key, 'g'), `(?<${key}>[\\w$]+)`);
          }

          const regexDef = new RegExp(patternRegexStr);

          let definitionMatch: RegExpMatchArray | null = null;
          let definitionIndex: number = 0;

          for (let i = 0; i < flatFileData.length; i++) {
            definitionMatch = flatFileData[i].code.match(regexDef);
            definitionIndex = i + 1;
            if (definitionMatch) break;
          }

          if (definitionMatch && definitionMatch.groups) {
            const actualVarName = definitionMatch.groups[key];

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
              continue;
            }

            let allUsagesMatched = false;

            for (let i = 1; i < patternVariablesInFile[key].length; i++) {
              let usagePatternCode = patternVariablesInFile[key][i].code;
              const usageRegex = new RegExp(patternConversion.escapeFunc(usagePatternCode));
              let matched = false;
              
              for (let j = definitionIndex; j < flatFileData.length; j++) {
                const userData = flatFileData[j];

                let normalizedCode = userData.code.replace(/[\r\n]/g, '');
                normalizedCode = normalizedCode.replace(/\[[^\]]*\]/g, 'argument');
                normalizedCode = normalizedCode.replace(/\{[^}]*\}/g, 'argument');

                const usageMatch = normalizedCode.match(usageRegex);

                if (usageMatch) {
                  let isMatchValid = true;

                  if (mode >= 1) {
                    const userTypes = userData.types;
                    const expectedTypes = patternVariablesInFile[key][i].types;

                    if (userTypes.length !== expectedTypes.length) {
                      isMatchValid = false;
                    } else {
                      for (let k = 0; k < expectedTypes.length; k++) {
                        // userTypes[k].sort() は元の配列を破壊（ミューテート）してしまう副作用があるため、
                        // スプレッド構文 [...arr] で浅いコピーを作ってからソートする。
                        // さらに重い JSON.stringify を排除し、join(',') を使ってメモリ効率よく文字列比較を行う。
                        const uT = [...userTypes[k]].sort().join(',');
                        const eT = [...expectedTypes[k]].sort().join(',');
                        if (uT !== eT) {
                          isMatchValid = false;
                          break;
                        }
                      }
                    }

                    if (isMatchValid && mode >= 2) {
                      // ADD: 今後追加検討 (argContextsの比較ロジック)
                    }
                  }

                  if (isMatchValid) {
                    matched = true;
                    break;
                  }
                }
              }

              if (!matched) {
                allUsagesMatched = false;
                break;
              }

              if (i === patternVariablesInFile[key].length - 1) {
                allUsagesMatched = true;
              }
            }

            if (allUsagesMatched) {
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