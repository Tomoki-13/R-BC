import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';
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
    inputs[i] = inputs[i].replace(/\//g, `\\/`);
    inputs[i] = inputs[i].replace(/['"`]/g, `["'\`]`);
    inputs[i] = inputs[i].replace(/ \* /g, ' \\* ');
  }
  return inputs;
}


// 全てのパターンの末尾に.が来ないように
const checkDot = (inputs: string[]): string[] => {
  for (let i = 0; i < inputs.length; i++) {
    inputs[i] = inputs[i].concat("[^.]*$");
  }
  return inputs;
}

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
  let copiedRespattern: string[][][] = JSON.parse(JSON.stringify(respattern));
  for (let i = 0; copiedRespattern.length > i; i++) {
    for (let j = 0; copiedRespattern[i].length > j; j++) {
      copiedRespattern[i][j] = prep_repl(copiedRespattern[i][j]);
      for (let k = 1; copiedRespattern[i][j].length > k; k++) {
        if (typeof copiedRespattern[i][j][k] === 'string' && (copiedRespattern[i][j][k].includes('require') || copiedRespattern[i][j][k].includes('import') || copiedRespattern[i][j][k].includes('_interopRequireDefault'))) {
          continue;
        }
        copiedRespattern[i][j][k] = transformArgumrnt(copiedRespattern[i][j][k]);
      }
      copiedRespattern[i][j] = replaceQuoteAndasterisk(copiedRespattern[i][j]);
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
  let copiedRespattern: ExtractFunctionCallsResult[][][] = JSON.parse(JSON.stringify(respattern));
  // string[][][]に変換してabstStrを適用
  let tempStringPattern: string[][][] = copiedRespattern.map(patternGroup =>
    patternGroup.map(block =>
      block.map(item => item.FunctionCallCode).flat()
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

export default {
  escapeFunc,
  abstStr,
  typeAwareAbstStr,
};