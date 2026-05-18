import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
import patternUtils from './patternUtils';

/**
 * ---数字（例: ---1, ---2）を正規表現の名前付きキャプチャグループ（例: (?<variable1>[\w-]+)）に置換する処理
 * 初回出現時はキャプチャグループを生成し、2回目以降は変数名のみを参照する
 */
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

/**
 * 正規表現で扱うために、クォート('"`), アスタリスク(*), スラッシュ(/)をエスケープ・抽象化する処理
 * すでに抽象化済みの形跡があれば処理をスキップする
 */
const replaceQuoteAndasterisk = (inputs: string[]): string[] => {
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].includes("[\"'`]") || inputs[i].includes('["\'`]')) {
      continue;
    }

    inputs[i] = inputs[i].replace(/\//g, `\\/`);
    inputs[i] = inputs[i].replace(/['"`]/g, `["'\`]`);
    inputs[i] = inputs[i].replace(/ \* /g, ' \\* ');
  }
  return inputs;
}


/**
 * メソッドチェーンなど後続の呼び出しを許容しないよう、パターンの末尾に [^.]*$ を付与する処理
 */
const checkDot = (inputs: string[]): string[] => {
  for (let i = 0; i < inputs.length; i++) {
    if (!inputs[i].endsWith("[^.]*$")) {
      inputs[i] = inputs[i].concat("[^.]*$");
    }
  }
  return inputs;
};


/**
 * 文字列中の括弧 () を正規表現のエスケープ文字 \( \) に変換する処理
 * ただし、名前付きグループ (?<name>) や 否定先読み (?!...) など特殊な正規表現構文内の括弧はエスケープ対象から除外する
 */
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

/**
 * 関数呼び出しの引数部分を抽象化し、引数の数に応じた正規表現（[^,]*）に置き換える処理
 * ネストされた括弧や文字列リテラル内のカンマは無視してトップレベルの引数のみをカウントする
 */
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

/**
 * 文字列配列(string[][][])に対して、変数の置換(prep_repl)、引数の抽象化(transformArgumrnt)、エスケープ(replaceQuoteAndasterisk)などを一括適用し、正規表現パターンへと変換する処理
 * @param respattern 処理対象の文字列パターン
 * @param mode 1の場合は重複削除処理をスキップする
 */
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

/**
 * 型情報(ExtractFunctionCallsResult)を保持したまま、内部のFunctionCallCodeに対して abstStr(抽象化処理) を適用するラッパー関数
 */
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

/**
 * 型情報オブジェクト配列(ExtractFunctionCallsResult[][][])から、コード文字列部分(FunctionCallCode)のみを抽出して string[][][] に変換する処理
 */
const extractFunctionCallCodes = (
  data: ExtractFunctionCallsResult[][][]
): string[][][] => {
  return data.map(level1 =>
    level1.map(level2 =>
      level2.map(item => item.FunctionCallCode)
    )
  );
};

/**
 * 文字列配列(string[][][])から、空の型情報オブジェクト(ExtractFunctionCallsResult)を持つ配列へと復元する処理
 */
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
 * パターンの空白文字を正規化し、包含関係にある重複パターン(短い方)を削除して整理する関数
 */
const formatAndIntegratePattern = (
  pattern: string[][],
): string[][] => {
  // 1. 空白・タブ・改行の削除と正規化
  let formattedPattern = pattern.map(subPattern =>
    subPattern.map(item => item.trim().replace(/\s+/g, ' '))
  );
  let tmp_pattern = formattedPattern.map(arr1d => [...arr1d]);
  
  let indicesToRemove: number[] = [];
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

  indicesToRemove.sort((a, b) => b - a);
  indicesToRemove = [...new Set(indicesToRemove)];

  if (indicesToRemove.length > 0) {
    for (const index of indicesToRemove) {
      formattedPattern.splice(index, 1);
    }
  }
  
  formattedPattern = patternUtils.alignNumbersInPattern(formattedPattern).after;
  return formattedPattern;
};

/**
 * 2つの配列(arr1, arr2)が包含関係にある、または完全に一致するかを判定する処理
 */
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

/**
 * short配列の要素が、順不同で全てlong配列に含まれているかをチェックする処理
 */
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

/** 
 * 抽象化処理後の最終的なパターン群(string[][][])に対し、
 * クライアント(string[][])の内部にあるブロック(string[])間の重複のみを統合する処理
 */
const deduplicateFinalPatterns = (patterns: string[][][]): string[][][] => {
  // --- ブロック(string[])から数字を無視したシグネチャを作る関数 ---
  const getNormalizedBlockSignature = (block: string[]): string => {
    let str = block.join('\n');
    const matches = str.match(/variable\d+/g);
    if (matches) {
      const uniqueVars = Array.from(new Set(matches));
      uniqueVars.forEach((v, index) => {
        const regex = new RegExp(v + '(?!\\d)', 'g');
        str = str.replace(regex, `__VAR_${index + 1}__`);
      });
    }
    return str;
  };

  // --- ブロック内のvariable数字の最小値を取得する関数 ---
  const getMinNum = (b: string[]) => {
    const bStr = b.join('\n');
    const nums = (bStr.match(/variable\d+/g) || []).map(s => parseInt(s.replace('variable', ''), 10));
    return nums.length > 0 ? Math.min(...nums) : Infinity;
  };

  // 各クライアントごとに、内部のブロック重複を排除して返す
  return patterns.map(clientPattern => {
    const uniqueMap = new Map<string, string[]>();
    
    for (const block of clientPattern) {
      const sig = getNormalizedBlockSignature(block);
      
      if (!uniqueMap.has(sig)) {
        uniqueMap.set(sig, block);
      } else {
        const existingBlock = uniqueMap.get(sig)!;
        if (getMinNum(block) < getMinNum(existingBlock)) {
          uniqueMap.set(sig, block); // 数字が小さい方で上書き
        }
      }
    }
    
    return Array.from(uniqueMap.values());
  });
};

export default {
  escapeFunc,
  abstStr,
  typeAwareAbstStr,
  extractFunctionCallCodes,
  restoreExtractFunctionCallsResult,
  formatAndIntegratePattern,
  deduplicateFinalPatterns
};