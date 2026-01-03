import patternConversion from "./patternConversion";
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";

/**
 * 型情報を考慮したパターンマッチング関数
 * @param {ExtractFunctionCallsResult[]} user_results 解析済みのユーザーコードデータ
 * @param {ExtractFunctionCallsResult[][][]} respattern 検出対象のパターンリスト
 * @returns {Promise<[boolean, ExtractFunctionCallsResult[][] | null]>}
 */
export const typeAwarePatternMatch = async (
  user_results: ExtractFunctionCallsResult[],
  respattern: ExtractFunctionCallsResult[][][]
): Promise<[boolean, ExtractFunctionCallsResult[][] | null]> => {
  let search_patterns: ExtractFunctionCallsResult[][][] = JSON.parse(JSON.stringify(respattern));

  // ユーザーデータの整形
  const flat_user_data = user_results.map(block => ({
    code: block.FunctionCallCode,
    types: block.argTypes, // 引数ごとの型リストを保持
    context: block.argContexts
  }));

  try {
    for (const search_pattern of search_patterns) {
      // 変数ごとのパターン整理
      const variableMap: { [key: string]: { code: string, types: string[][] }[] } = {};

      for (const search_block_group of search_pattern) {
        for (const search_block of search_block_group) {
          const str = search_block.FunctionCallCode;
          const match = str.match(/variable(\d+)/g);

          if (match) {
            const key = match[0]; // 簡易的に最初の変数をキーとする
            if (!variableMap[key]) {
              variableMap[key] = [];
            }
            variableMap[key].push({
              code: str,
              types: search_block.argTypes
            });
          }
        }
      }

      // 判定フラグの初期化
      const variableMapJudge: { [key: string]: boolean } = {};
      for (const key in variableMap) {
        if (Object.prototype.hasOwnProperty.call(variableMap, key)) {
          variableMapJudge[key] = false;
        }
      }

      const variableMapCopy = JSON.parse(JSON.stringify(variableMap));

      // 変数ごとの一致確認
      for (const key in variableMapCopy) {
        if (Object.prototype.hasOwnProperty.call(variableMapCopy, key)) {

          // 定義部分の特定
          const regex1: RegExp = new RegExp(patternConversion.escapeFunc(variableMapCopy[key][0].code));
          let importMatch: RegExpMatchArray | null = null;
          let num: number = 0;

          for (let i = 0; i < flat_user_data.length; i++) {
            importMatch = flat_user_data[i].code.match(regex1);
            num++;
            if (importMatch) break;
          }

          if (importMatch && importMatch?.groups) {
            const importName = importMatch.groups[key];

            // 変数名の置換処理
            for (const key1 in variableMapCopy) {
              for (let i = 0; i < variableMapCopy[key1].length; i++) {
                if (!(key1 == key && i == 0)) {
                  variableMapCopy[key1][i].code = variableMapCopy[key1][i].code.replace(key, importName);
                }
              }
            }

            if (variableMapCopy[key].length === 1) {
              variableMapJudge[key] = true;
              continue;
            }
            // 関数使用部分の検証
            for (let i = 1; i < variableMapCopy[key].length; i++) {
              let functionCallPatternStr = variableMapCopy[key][i].code;
              const functionCallPattern = new RegExp(patternConversion.escapeFunc(functionCallPatternStr));
              let matched = false;

              for (let j = num; j < flat_user_data.length; j++) {
                const userData = flat_user_data[j];

                // コードの正規化
                let replaceuserpattern = userData.code.replace(/[\r\n]/g, '');
                replaceuserpattern = replaceuserpattern.replace(/\[[^\]]*\]/g, 'argument');
                replaceuserpattern = replaceuserpattern.replace(/\{[^}]*\}/g, 'argument');

                const functionCallMatch = replaceuserpattern.match(functionCallPattern);
                // console.log("replaceuserpattern", replaceuserpattern);
                // console.log("functionCallPattern", functionCallPattern);
                // console.log("functionCallMatch", functionCallMatch);

                if (functionCallMatch) {
                  const userTypes = userData.types;
                  const expectedTypes = variableMapCopy[key][i].types;

                  let typeMatched = true;

                  // 型の一致判定: 引数の数が一致し、かつ各引数の型情報が完全一致するか検証
                  // ADD: 完全一致
                  if (userTypes.length !== expectedTypes.length) {
                    typeMatched = false;
                  } else {
                    for (let k = 0; k < expectedTypes.length; k++) {
                      // 配列の中身（型候補）の比較。JSON文字列化して比較することで配列の一致を確認
                      if (JSON.stringify(userTypes[k].sort()) !== JSON.stringify(expectedTypes[k].sort())) {
                        typeMatched = false;
                        break;
                      }
                    }
                  }

                  if (typeMatched) {
                    // ADD: より深いコード構造の一致や、引数の具体的な値（Context）の解析ロジックをここに追加
                    matched = true;
                    break;
                  }
                }
              }

              if (i == variableMapCopy[key].length - 1 && matched) {
                variableMapJudge[key] = true;
                continue;
              }
            }
          }
        }
      }

      if (Object.values(variableMapJudge).every(value => value === true)) {
        return [true, search_pattern];
      }
    }
  } catch (err) {
    console.error('Error typeAwarePatternMatch:', err);
  }
  return [false, null];
};
