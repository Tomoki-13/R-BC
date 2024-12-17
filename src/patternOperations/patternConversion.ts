//置換処理
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
                //\\w+だと-は取得不可
                replacedIndexes[varName] = `(?<${varName}>[\\w-]+)`;
                return replacedIndexes[varName];
            } else {
                //変数に入れた文字列には${importMatch?.groups[${varName}]}が機能しない
                return `${varName}`;
            }
        });
    });
}

//'`"を許容するように
const replaceQuote =  (inputs: string[]):  string[]  => {
    for(let i = 0;i < inputs.length;i++) {
        inputs[i] = inputs[i].replace(/['"`]/g, `["'\`]`);
    }
    return inputs;
}
//全てのパターンの末尾に.が来ないように
const checkDot =  (inputs: string[]):  string[]  => {
    for(let i = 0;i < inputs.length;i++) {
        inputs[i] = inputs[i].concat("\\s*[^.]*");
    }
    return inputs;
}

//(?<variable2>[\\w-]+) 以外の()の処理
function escapeFunc(str: string): string {
    let escapedStr = '';
    let i = 0;
    const length = str.length;
    let insideQuote = false;
    let quoteChar = '';
    let insideSpecialPart = false;
    const specialPartStart = /\(\?\<[\w-]+\>/;
    while (i < length) {
        const char = str[i];
        //引用符の開始を検出
        if (char === '"' || char === "'") {
            if (!insideQuote) {
                insideQuote = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                insideQuote = false;
                quoteChar = '';
            }
            escapedStr += char;
            i++;
            continue;
        }
        //特定の部分の検出と処理
        if (insideSpecialPart) {
            //特定の部分の処理
            if (char === ')') {
                insideSpecialPart = false;
            }
            escapedStr += char;
        } else {
            //普通の括弧処理
            if (char === '(') {
                //開き括弧のエスケープ
                if (str.substring(i).match(specialPartStart)) {
                    insideSpecialPart = true;
                    escapedStr += char;
                } else {
                    escapedStr += '\\(';
                }
            } else if (char === ')') {
                //閉じ括弧のエスケープ
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
    //関数名と引数部分を取得
    const functionName = match[1];
    let args = match[2];
    args = args.replace(/:\s*\[.*?\]/g, ':[]');
    args = args.replace(/\{[^}]*\}/g, 'argument');
    //引数がカンマで区切られている場合
    if (args.includes(',')) {
        //引数をカンマで分割し、それぞれに [^,]* を適用
        const parts = args.split(',');
        const transformedArgs = parts.slice(0, -1).map(() => '[^,]*').concat('[^,]*').join(',');
        return `${functionName}\\(${transformedArgs}\\)`;
    } else if(args.length > 0){
        //引数がカンマで区切られていない場合はそのまま返す
        return `${functionName}\\([^,]*\\)`;
    } else{
        return str
    }
}
//パターンへの変換
function abstStr(respattern: string[][][]): string[][][] {
    let copiedRespattern:string[][][] = JSON.parse(JSON.stringify(respattern));
    for(let i = 0; copiedRespattern.length > i; i++) {
        for(let j = 0; copiedRespattern[i].length > j; j++) {
            copiedRespattern[i][j] = prep_repl(copiedRespattern[i][j]);
            copiedRespattern[i][j] = replaceQuote(copiedRespattern[i][j]);
            copiedRespattern[i][j] = checkDot(copiedRespattern[i][j]);
            for(let k = 1; copiedRespattern[i][j].length > k; k++) {
                if (typeof copiedRespattern[i][j][k] === 'string' &&(copiedRespattern[i][j][k].includes('require') ||copiedRespattern[i][j][k].includes('import') ||copiedRespattern[i][j][k].includes('_interopRequireDefault'))) {
                    continue;
                }
                copiedRespattern[i][j][k] = transformArgumrnt(copiedRespattern[i][j][k]);
            }
        }
    }
    //重複パターンの削除copiedRespattern[i][j]
    //console.log(copiedRespattern.length);
    for(let i = copiedRespattern.length - 1; i >= 0; i--) {
        if(Array.isArray(copiedRespattern[i])) {
            for(let j = copiedRespattern[i].length - 1; j >= 0; j--) {
                if(Array.isArray(copiedRespattern[i][j])) {
                    const uniqueElements = [...new Set(copiedRespattern[i][j])];
                    copiedRespattern[i][j] = uniqueElements;
                    if(copiedRespattern[i][j].length === 0) {
                        copiedRespattern[i].splice(j, 1);
                    }
                }
            }

            // 外部の配列が空なら削除
            if(copiedRespattern[i].length === 0) {
                copiedRespattern.splice(i, 1);
            }
        }
    }
    return copiedRespattern;
}

export default {
    escapeFunc,
    abstStr,
};