//パターンマッチング用関数
export const patternMatch = async (userpatterns: string[][], search_patterns: string[][][]): Promise<[boolean, string[][] | null]> => {
    //検出用を回す
    try {
        for (const search_pattern of search_patterns) {
            //現在の search_pattern が全て userpatterns に一致するかどうかを示すフラグ
            //let patternMatched = true;

            // search_pattern 全体の variableMap を作成
            const variableMap: { [key: string]: string[] } = {};
            for (const search_one of search_pattern) {
                let serp: string[] = prep_repl(search_one);
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
            }
            //console.log(variableMap);

            //判定用
            const variableMapJudge: { [key: string]: boolean } = {};
            for (const key in variableMap) {
                if (variableMap.hasOwnProperty(key)) {
                    variableMapJudge[key] = false;
                }
            }

            for (const userpattern of userpatterns) {
                //variableMap 内の全てのパターンが一致するか確認する
                for (const key in variableMap) {
                    if (variableMap.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(escapeFunc(variableMap[key][0]));
                        let importMatch: RegExpMatchArray | null = null;
                        let num: number = 0;
                        for (const line of userpattern) {
                            importMatch = line.match(regex1);
                            num++;
                            if (importMatch) {
                                break;
                            }
                        }

                        if (importMatch && importMatch?.groups) {
                            const importName = importMatch.groups[key];
                            for(const key1 in variableMap){
                                for(let i = 0; i < variableMap[key1].length; i++){
                                    if(!(key1 == key && i == 0)){
                                        variableMap[key1][i] = variableMap[key1][i].replace(key, importName);
                                    }
                                }
                            }
                            const keys = Object.keys(variableMap);
                            if (keys.length === 1) {
                                const key = keys[0];
                                if (variableMap[key].length === 1) {
                                    // console.log('variableMapJudge');
                                    // console.log(variableMapJudge);
                                    return [true, search_pattern];
                                }
                            } else if (variableMap[key].length === 1) {
                                variableMapJudge[key] = true;
                            }
                            for (let i = 1; i < variableMap[key].length; i++) {
                                let functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                functionCallPatternStr = transformArgumrnt(functionCallPatternStr);
                                //抽象化 
                                //functionCallPatternStr = functionCallPatternStr.replace(/\((.*?)\)/g, (_, inner) => inner ? "(.*?)" : "()");
                                const functionCallPattern = new RegExp(escapeFunc(functionCallPatternStr));
                                let matched = false;
                                for (let j = num; j < userpattern.length; j++) {
                                    //userpattern[j]に[]がある時の処理
                                    let replaceuserpattern = userpattern[j].replace(/\[[^\]]*\]/g, 'argument');
                                    //userpattern[j]に{}がある時の処理
                                    replaceuserpattern = replaceuserpattern.replace(/\{[^}]*\}/g, 'argument');
                                    const functionCallMatch = replaceuserpattern.match(functionCallPattern);
                                    if (functionCallMatch) {
                                        //一致が見つかった場合
                                        matched = true;
                                        break;
                                    } else {
                                        //一致が見つからない場合
                                        matched = false;
                                    }
                                }
                                if (!matched) {
                                    variableMapJudge[key] = false;
                                    break;
                                }
                                if(i == variableMap[key].length - 1 && matched){
                                    variableMapJudge[key] = true;
                                }
                            }
                        } else {
                            variableMapJudge[key] = false;
                        }
                        if (variableMapJudge[key] == false) {
                            break;
                        }
                    }
                }
                //現在の search_pattern が一致
                if (Object.values(variableMapJudge).every(value => value === true)) {
                    // console.log('variableMapJudge');
                    // console.log(variableMapJudge);
                    return [true, search_pattern];
                }
            }

            if (Object.values(variableMapJudge).every(value => value === true)) {
                console.log('variableMapJudge');
                console.log(variableMapJudge);
                return [true, search_pattern];
            }
        }
    } catch (err) {
        console.error('Error readFile:', err);
    }
    return [false, null];
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
    const match = str.match(/^(.*?)\((.*?)\)$/);
    if (!match) return str;
    //関数名と引数部分を取得
    const functionName = match[1];
    let args = match[2];
    args = args.replace(/\[[^\]]*\]/g, 'argument');
    args = args.replace(/\{[^}]*\}/g, 'argument');
    //引数がカンマで区切られている場合
    if (args.includes(',')) {
        //引数をカンマで分割し、それぞれに [^,]* を適用
        const parts = args.split(',');
        const transformedArgs = parts.slice(0, -1).map(() => '[^,]*').concat('[^,]*').join(',');
        return `${functionName}\(${transformedArgs}\)`;
    } else if(args.length > 0){
        //引数がカンマで区切られていない場合はそのまま返す
        return `${functionName}\([^,]*\)`;
    } else{
        return str
    }
}