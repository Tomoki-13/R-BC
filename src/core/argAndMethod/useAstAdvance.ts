import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";
import { extractImportLines } from "../../utils/extractImportLines";
import { analyzeMethod } from "../../astRelated/analyzer/analyzeMethod";
import { getExportModuleProperty } from '../../astRelated/analyzer/getExportModuleProperty';
import patternUtils from '../../patternOperations/patternUtils';
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import { analyzeArgAndMethod } from '../../astRelated/analyzer/analyzeArgandMethod';
import { getFileRelated } from '../../astRelated/trace/getFileRelated';
import { OutboundFileDependencies } from '../../types/FileDependencies';
import { InboundFunctionDependencies } from '../../types/FileDependencies';
import { reverseDependencies } from '../../astRelated/trace/reverseDependencies';

// createPattern用(抽象化あり) mode = 1, detectByPattern用 mode = 0
export const useAstAdvance = async (allFiles: string[], libName: string, mode: number = 0): Promise<ExtractFunctionCallsResult[][]> => {
  let pattern: ExtractFunctionCallsResult[][] = [];
  const visitedFiles: Set<string> = new Set<string>();

  // 抽象化時の番号 ファイルを超えても区別するため
  let j = 1;

  // リポジトリ内の依存関係を取得
  const groupedDependencies: OutboundFileDependencies[] = getFileRelated(allFiles);
  // 依存関係の逆転
  const reversed: InboundFunctionDependencies[] = reverseDependencies(groupedDependencies);

  for (const filePath of allFiles) {
    if (visitedFiles.has(filePath)) continue;
    visitedFiles.add(filePath);

    try {
      const fileContent = await fsPromises.readFile(filePath, 'utf8');

      // Import行の抽出
      const lines: string[] = extractImportLines(fileContent, libName);

      let inFileStr: ExtractFunctionCallsResult[] = [];
      if (lines.length > 0) {
        lines.forEach(line => {
          inFileStr.push({
            FunctionCallCode: line,
            argTypes: [line].map(() => []),    // import文に引数型はないため空配列
            argContexts: [line].map(() => [])  // import文に引数コンテキストはないため空配列
          });
        });
      }

      // 関数の使用部分の抽出
      let funcName: string[] = [];
      for (const line of lines) {
        let name: string[] = funcNameIdentifiers(line, libName);
        if (name.length > 0) {
          funcName = funcName.concat(name);
          for (const one of funcName) {
            const secUseFuncnames = secfuncNameIdentifiers(one, fileContent);
            if (secUseFuncnames.length > 0) {
              funcName = funcName.concat(secUseFuncnames);
            }
          }
        }
      }

      if (funcName.length > 0) {
        const uniquefuncName: string[] = [...new Set(funcName)];

        // 抽出対象の関数名ごとにループ
        for (const one of uniquefuncName) {
          let result: ExtractFunctionCallsResult[] = await analyzeArgAndMethod(filePath, one, reversed);

          if (result.length > 0) {
            if (mode === 1) {
              const checkstr = 'mock';
              let hasMock = false;
              for (const subresult of result) {
                // FunctionCallCode配列のいずれかに 'mock' が含まれるか
                if (subresult.FunctionCallCode.includes(checkstr)) {
                  hasMock = true;
                  break;
                }
              }
              if (hasMock) return [];

              let except_str = await getExportModuleProperty(filePath, one);
              if (except_str.length > 0) {
                return [];
              }
            }
            inFileStr = inFileStr.concat(result);
          }
        }

        if (inFileStr.length > 0) {
          // TODO: 重複削除
          if (mode === 0) {
            pattern.push(inFileStr);
          } else if (mode === 1) {
            const letregex = /^\s*(?:let|const|var)/;
            const base = "---";
            let sortUniquefuncName = uniquefuncName.sort((a, b) => b.length - a.length);

            // 各 Result オブジェクトに対して処理
            for (let resIndex = 0; resIndex < inFileStr.length; resIndex++) {
              let code = inFileStr[resIndex].FunctionCallCode;

              // let/const/var 削除
              code = code.replace(letregex, '').trimStart();

              for (const one of sortUniquefuncName) {

                let replaceString: string = base + j.toString(); // 元のロジック通りならここで j を使う
                let mainregex = new RegExp(`(?<!["\`'])${one}(?!["\`'])`, 'g');

                // 現在のResultオブジェクト内のコード全てに対して置換実行
                // 特殊処理：{}呼び出し系
                if (/import|require/.test(code) && !/^\s*\/\//.test(code) && /\{.*\}/.test(code)) {
                  let regex1 = new RegExp(`:\\s*(?<!["\`'])${one}(?!["\`'])`, 'g');
                  let regex2 = new RegExp(`as\\s*(?<!["\`'])${one}(?!["\`'])`, 'g');
                  if (regex1.test(code) || regex2.test(code)) {
                    code = code.replace(mainregex, replaceString);
                  }
                } else {
                  code = code.replace(mainregex, replaceString);
                }
                j++; // 変数ひとつ処理するごとに番号を進める
              }

              // 処理結果を戻す
              inFileStr[resIndex].FunctionCallCode = code;
            }
            pattern.push(inFileStr);
          }
        }
      }
    } catch (err) {
      console.error('Error readFile:', err);
    }
  }

  for (let i = 0; i < pattern.length; i++) {
    // 配列の後ろからループ（削除時のインデックスずれ防止）
    for (let resIndex = pattern[i].length - 1; resIndex >= 0; resIndex--) {
      let code = pattern[i][resIndex].FunctionCallCode; // string

      // 文字数制限チェック
      if (code.length > 400) {
        pattern[i].splice(resIndex, 1);
        continue; // 削除したので次の処理へ
      }

      // フォーマット処理
      if (typeof code === 'string') {
        code = code.replace(/[\r\n]/g, '');
        code = code.replace(/^,|,$/g, '');
        if (code.endsWith(';')) {
          code = code.slice(0, -1);
        }
        code = code.trim().replace(/\s+/g, ' ');
      }

      if (code.length === 0) {
        pattern[i].splice(resIndex, 1);
      } else {
        // 更新された文字列を戻す
        pattern[i][resIndex].FunctionCallCode = code;
      }
    }
  }
  // 空のファイル配列を削除
  pattern = pattern.filter(subArray => subArray.length > 0);

  // 改行、カンマ、末尾のセミコロン削除、空白整理
  if (pattern.length > 0) {
    for (let i = 0; i < pattern.length; i++) {
      for (let resIndex = 0; resIndex < pattern[i].length; resIndex++) {
        let c = pattern[i][resIndex].FunctionCallCode;

        if (typeof c === 'string') {
          c = c.replace(/[\r\n]/g, '');
          c = c.replace(/^,|,$/g, '');
          if (c.endsWith(';')) {
            c = c.slice(0, -1);
          }
          c = c.trim().replace(/\s+/g, ' ');
        }

        // 処理結果を再代入
        pattern[i][resIndex].FunctionCallCode = c;
      }
    }
  }
  return pattern;
}

// TODO:　本来は重複削除に使う
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