export const patternMatch = async (userpatterns: string[][], libName: string, search_patterns: string[][][]): Promise<boolean> => {
    //検出用を回す
    for (const search_pattern of search_patterns) {
        //現在の search_pattern が全て userpatterns に一致するかどうかを示すフラグ
        let patternMatched = true;

        //現在の search_pattern 内の各パターンを処理する
        for (const search_one of search_pattern) {
            //現在の search_one が userpatterns に一致するかどうかを示すフラグ
            let matched = false;
            
            for (const userpattern of userpatterns) {
                let serp: string[] = prep_repl(search_one);
                //variable数字の部分を処理　
                const variableMap: { [key: string]: string[] } = {};
                for (const str of serp) {
                    const match = str.match(/variable(\d+)/g);
                    if (match) {
                        const key = match[0];
                        if (!variableMap[key]) {
                            variableMap[key] = [];
                        }
                        variableMap[key].push(str);
                    }
                }

                // console.log("variableMap:");
                // console.log(variableMap);

                //variableMap 内の全てのパターンが一致するか確認する
                for (const key in variableMap) {
                    if (variableMap.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(escapeFunc(variableMap[key][0]));
                        let importMatch: RegExpMatchArray | null = null;
                        let num: number = 0;
                        for (const line of userpattern) {
                            importMatch = line.match(regex1);
                            // console.log('line');
                            // console.log(line);
                            num++;
                            if (importMatch) {
                                break;
                            }
                        }

                        console.log(importMatch);
                        if (importMatch && importMatch?.groups) {
                            const keys = Object.keys(variableMap);
                            if (keys.length === 1) {
                                const key = keys[0];
                                //keyが1，要素が１個しかない時の処理
                                if (variableMap[key].length === 1) {
                                    return true;
                                }
                            }
                            const importName = importMatch.groups[key];
                            console.log(key);
                            console.log("インポートされた名前:", importName);
                            //追加のパターンを動的に作成して一致するか確認する
                            for (let i = 1; i < variableMap[key].length; i++) {
                                //動的に関数呼び出しのパターンを作成
                                const functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                const functionCallPattern = new RegExp(functionCallPatternStr);
                                
                                //userpattern の残りの行で動的に作成したパターンに一致するか確認する
                                for (let j = num; j < userpattern.length; j++) {
                                    console.log("j:" + j);
                                    console.log("userpattern[j]:" + userpattern[j]);
                                    const functionCallMatch = userpattern[j].match(functionCallPattern);
                                    if (functionCallMatch) {
                                        //一致が見つかった場合
                                        //console.log("マッチ");
                                        //console.log("userpattern[j]:" + userpattern[j]);
                                        //console.log(functionCallPattern);
                                        matched = true;
                                        break;
                                    } else {
                                        //一致が見つからない場合
                                        console.log("２つ目以降マッチなし");
                                        matched = false;
                                    }
                                }
                                if (!matched) {
                                    break;
                                }
                            }
                        } else {
                            //呼び出しマッチが見つからない場合
                            console.log("呼び出しマッチなし");
                            matched = false;
                        }
                        console.log(matched);
                        if (!matched) {
                            break;
                        }
                    }
                }
                if (matched) {
                    break;
                }
            }
            //現在の search_one が一致しなかった場合
            if (!matched) {
                patternMatched = false;
                break;
            }
        }
        //現在の search_pattern が一致した場合
        if (patternMatched) {
            return true;
        }
    }
    return false;
};
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
//(?<variable2>[\\w-]+) 以外の()の処理
function escapeFunc(str: string): string {
    let escapedStr = '';
    let i = 0;
    const length = str.length;
    let insideQuote = false;
    let quoteChar = '';
    let insideSpecialPart = false;
    let specialPartStart = /(?:\<|\?)(?:variable|[\w-]+)/;
    let specialPartPattern = /(?:\<|\?)(?:variable|[\w-]+)[\w-]*\)/;
    while (i < length) {
        const char = str[i];
        // 引用符の開始を検出
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
        // 特定の部分の検出と処理
        if (insideSpecialPart) {
            // 特定の部分の処理
            if (char === ')') {
                insideSpecialPart = false;
            }
            escapedStr += char;
        } else {
            // 普通の括弧処理
            if (char === '(') {
                //開き括弧のエスケープ
                if (str.substring(i + 1).match(specialPartPattern)) {
                    escapedStr += char;
                } else {
                    escapedStr += '\\(';
                }
            } else if (char === ')') {
                //閉じ括弧のエスケープ
                if (str.substring(i - 1).match(specialPartPattern)) {
                    escapedStr += char;
                } else {
                    escapedStr += '\\)';
                }
            } else {
                escapedStr += char;
            }
        }
        // 特定の部分を検出するための状態管理
        if (str.substring(i).match(specialPartStart)) {
            insideSpecialPart = true;
        }

        i++;
    }
    return escapedStr;
}