import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
import patternUtils from './patternUtils';

// 置換処理
function prep_repl(inputs: string[]): string[] {
  const replLoc: RegExp = /---(\d+)/g;
  let replacedIndexes: { [key: string]: string } = {};
  let firstOccurrences: { [key: string]: boolean } = {};

  return inputs.map((input) => {
    let count = 0;
    return input.replace(replLoc, (match, p1) => {
      count++;
      const varName = `variable${p1}`;
      if (!firstOccurrences.hasOwnProperty(varName)) {
        firstOccurrences[varName] = true;
        // \\w+だと-は取得不可
        replacedIndexes[varName] = `(?<${varName}>[\\w-]+)`;
        return replacedIndexes[varName];
      } else {
        return `${varName}`;
      }
    });
  });
}

// '`" ,*,/の設定
const replaceQuoteAndasterisk = (inputs: string[]): string[] => {
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].includes("[\"'`]")){
      return inputs;
    }

    inputs[i] = inputs[i].replace(/\//g, `\\/`);
    inputs[i] = inputs[i].replace(/['"`]/g, `["'\`]`);
    inputs[i] = inputs[i].replace(/ \* /g, ' \\* ');
  }
  return inputs;
}


// 全てのパターンの末尾に.が来ないように
const checkDot = (inputs: string[]): string[] => {
  for (let i = 0; i < inputs.length; i++) {
    if (!inputs[i].endsWith("[^.]*$")) {
      inputs[i] = inputs[i].concat("[^.]*$");
    }
  }
  return inputs;
};


// (?<variable2>[\\w-]+) 以外の()の処理、(?!\\.)も除外
function escapeFunc(str: string): string {
  let escapedStr = '';
  let i = 0;
  const length = str.length;
  let insideSpecialPart = false;

  // 名前付きグループ(?<name>) または 否定先読み(?!...) の開始を検出
  const specialPartStart = /^\(\?(\<[\w-]+\>|!)/;

  while (i < length) {
    const char = str[i];

    // 特定の部分の検出と処理
    if (insideSpecialPart) {
      if (char === ')') {
        insideSpecialPart = false;
      }
      escapedStr += char;
    } else {
      // 普通の括弧処理
      if (char === '(') {
        // 特殊なパターンの開始かどうかチェック
        if (str.substring(i).match(specialPartStart)) {
          insideSpecialPart = true;
          escapedStr += char;
        } else {
          // 開き括弧のエスケープ
          escapedStr += '\\(';
        }
      } else if (char === ')') {
        // 閉じ括弧のエスケープ
        escapedStr += '\\)';
      } else {
        escapedStr += char;
      }
    }
    i++;
  }
  return escapedStr;
}

//引数の抽象化
function transformArgumrnt(str: string): string {
  str = str.replace(/[\r\n]/g, '');
  const match = str.match(/^(.*?)\((.*?)\)$/);
  if (!match) return str;

  const functionName = match[1];
  const args = match[2];

  if (args.trim().length === 0) {
    return str;
  }

  // ネストとクォートを考慮して引数を分割
  let argCount = 1;
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (inQuote) {
      if (char === quoteChar && args[i - 1] !== '\\') {
        inQuote = false;
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inQuote = true;
        quoteChar = char;
      } else if (char === '[' || char === '{' || char === '(') {
        depth++;
      } else if (char === ']' || char === '}' || char === ')') {
        depth--;
      } else if (char === ',' && depth === 0) {
        // トップレベルのカンマでのみ分割カウントを増やす
        argCount++;
      }
    }
  }

  // 引数の数だけ [^,]* を生成して結合
  const transformedArgs = new Array(argCount).fill('[^,]*').join(',');
  return `${functionName}\(${transformedArgs}\)`;
}

//パターンへの変換
function abstStr(respattern: string[][][], mode: number = 0): string[][][] {
  let copiedRespattern: string[][][] = respattern.map(arr2d => arr2d.map(arr1d => [...arr1d]));
  for (let i = 0; copiedRespattern.length > i; i++) {
    for (let j = 0; copiedRespattern[i].length > j; j++) {
      copiedRespattern[i][j] = prep_repl(copiedRespattern[i][j]);
      for (let k = 1; copiedRespattern[i][j].length > k; k++) {
        if (typeof copiedRespattern[i][j][k] === 'string' && (copiedRespattern[i][j][k].includes('require') || copiedRespattern[i][j][k].includes('import') || copiedRespattern[i][j][k].includes('_interopRequireDefault'))) {
          continue;
        }
        copiedRespattern[i][j][k] = transformArgumrnt(copiedRespattern[i][j][k]);
      }
      const needsReplacement = copiedRespattern[i][j].some(str => {
        if (typeof str !== 'string') return false;
        // 否定後読み(?<!\\)を使い、直前にバックスラッシュが無い '"* を探索
        return /(?<!\\)['"*]/.test(str);
      });
      if (needsReplacement) {
        copiedRespattern[i][j] = replaceQuoteAndasterisk(copiedRespattern[i][j]);
      }
      copiedRespattern[i][j] = checkDot(copiedRespattern[i][j]);
    }
  }

  if (mode === 1) {
    return copiedRespattern;
  }

  //重複パターンの削除copiedRespattern[i][j]
  for (let i = copiedRespattern.length - 1; i >= 0; i--) {
    if (Array.isArray(copiedRespattern[i])) {
      for (let j = copiedRespattern[i].length - 1; j >= 0; j--) {
        if (Array.isArray(copiedRespattern[i][j])) {
          const uniqueElements = [...new Set(copiedRespattern[i][j])];
          copiedRespattern[i][j] = uniqueElements;
          if (copiedRespattern[i][j].length === 0) {
            copiedRespattern[i].splice(j, 1);
          }
        }
      }

      // 外部の配列が空なら削除
      if (copiedRespattern[i].length === 0) {
        copiedRespattern.splice(i, 1);
      }
    }
  }
  return copiedRespattern;
}

function typeAwareAbstStr(respattern: ExtractFunctionCallsResult[][][]): ExtractFunctionCallsResult[][][] {
  let copiedRespattern: ExtractFunctionCallsResult[][][] = respattern.map(arr2d =>
    arr2d.map(arr1d =>
      arr1d.map(item => ({
        FunctionCallCode: item.FunctionCallCode,
        filePath: item.filePath,
        line: item.line,
        argTypes: item.argTypes ? item.argTypes.map(types => [...types]) : [],
        argContexts: item.argContexts ? item.argContexts.map(ctx => [...ctx]) : []
      }))
    )
  );
  // string[][][]に変換してabstStrを適用
  let tempStringPattern: string[][][] = copiedRespattern.map(patternGroup =>
    patternGroup.map(block =>
      block.map(item => item.FunctionCallCode)
    ));
  tempStringPattern = abstStr(tempStringPattern, 1);

  for (let i = 0; i < copiedRespattern.length; i++) {
    for (let j = 0; j < copiedRespattern[i].length; j++) {
      for (let k = 0; k < copiedRespattern[i][j].length; k++) {
        copiedRespattern[i][j][k].FunctionCallCode = tempStringPattern[i][j][k];
      }
    }
  }
  return copiedRespattern;
}

const extractFunctionCallCodes = (
  data: ExtractFunctionCallsResult[][][]
): string[][][] => {
  return data.map(level1 =>
    level1.map(level2 =>
      level2.map(item => item.FunctionCallCode)
    )
  );
};

const restoreExtractFunctionCallsResult = (
  data: string[][][]
): ExtractFunctionCallsResult[][][] => {
  return data.map(level1 =>
    level1.map(level2 =>
      level2.map(code => ({
        FunctionCallCode: code,
        filePath: "",
        line: 0,
        argTypes: [],
        argContexts: []
      }))
    )
  );
};

/**
 * パターンの空白文字を正規化し、重複するパターンを統合・整理する関数
 * @param pattern 処理対象のパターン配列 (string[][])
 * @param mode 重複統合を行うかどうか (1: 行う, それ以外: 行わない)
 * @returns 整形後のパターン配列 (string[][])
 */
const formatAndIntegratePattern = (
  pattern: string[][],
): string[][] => {
  // 1. 空白・タブ・改行の削除と正規化（全体の配列をmapで一気に処理）
  let formattedPattern = pattern.map(subPattern =>
    subPattern.map(item => item.trim().replace(/\s+/g, ' '))
  );
  let tmp_pattern = formattedPattern.map(arr1d => [...arr1d]);
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
// パターンの---数字の部分を正規化して同一視するための関数
const getNormalizedSignature = (pattern: string[]): string => {
  let str = pattern.join('\n');
  const matches = str.match(/---\d+/g);
  if (matches) {
    const uniqueVars = Array.from(new Set(matches));
    uniqueVars.forEach((v, index) => {
      const regex = new RegExp(v + '(?!\\d)', 'g');
      str = str.replace(regex, `__VAR_${index + 1}__`);
    });
  }
  return str;
};
// クライアント内で同一のパターンを削除する
const deduplicatePatterns = (clientPatterns: string[][]): string[][] => {
  const uniqueMap = new Map<string, string[]>();

  for (const pattern of clientPatterns) {
    const sig = getNormalizedSignature(pattern);
    
    if (!uniqueMap.has(sig)) {
      uniqueMap.set(sig, pattern);
    } else {
      const existingPattern = uniqueMap.get(sig)!;
      const existingNums = (existingPattern.join('\n').match(/---\d+/g) || []).map(s => parseInt(s.replace('---', ''), 10));
      const currentNums = (pattern.join('\n').match(/---\d+/g) || []).map(s => parseInt(s.replace('---', ''), 10));

      const minExisting = existingNums.length > 0 ? Math.min(...existingNums) : Infinity;
      const minCurrent = currentNums.length > 0 ? Math.min(...currentNums) : Infinity;

      if (minCurrent < minExisting) {
        uniqueMap.set(sig, pattern);
      }
    }
  }
  return Array.from(uniqueMap.values());
};

export default {
  escapeFunc,
  abstStr,
  typeAwareAbstStr,
  extractFunctionCallCodes,
  restoreExtractFunctionCallsResult,
  formatAndIntegratePattern,
  deduplicatePatterns
};