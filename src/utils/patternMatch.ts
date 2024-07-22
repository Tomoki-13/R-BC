export const patternMatch = async (userpatterns: string[][], libName: string, search_patterns: string[][][]): Promise<boolean> => {
    let result: boolean = false;
        //検出用を回す
        for(const search_pattern of search_patterns){
            //userpattern > search_patternのいずれか
            for(const search_one of search_pattern){
                for(const userpattern of userpatterns){
                    let serp:string[] = prep_repl(search_one);
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
                    console.log("variableMap:");
                    console.log(variableMap);
                    //全部一致　true
                    for (const key in variableMap) {
                        if (variableMap.hasOwnProperty(key)) {
                            const regex1:RegExp = new RegExp(variableMap[key][0]);
                            let importMatch: RegExpMatchArray | null = null;
                            let num:number = 0;
                            for (const line of userpattern) {
                                importMatch = line.match(regex1);
                                console.log('line');
                                console.log(line);
                                num++;
                                if (importMatch) {
                                    break;
                                }
                            }
                            console.log(importMatch);
                            if (importMatch && importMatch?.groups) {
                                const importName = importMatch.groups[key];
                                console.log(key);
                                console.log("インポートされた名前:", importName);
                                for(let i = 1; i < variableMap[key].length;i++){
                                    //動的に関数呼び出しのパターンを作成
                                    const functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                    const functionCallPattern = new RegExp(functionCallPatternStr);
                                    for(let j = num; j < userpattern.length; j++){
                                        console.log("j:"+j);
                                        console.log("userpattern[j]:"+userpattern[j]);
                                        const functionCallMatch = userpattern[j].match(functionCallPattern);
                                        if (functionCallMatch) {
                                                // console.log("マッチ");
                                                // console.log("userpattern[j]:"+userpattern[j]);
                                                // console.log(functionCallPattern);
                                                result = true;
                                                break;
                                            } else {
                                                console.log("２つ目以降マッチなし");
                                                result = false;
                                            }
                                    }
                                    if(result == false){
                                        break;
                                    }
                                }
                            } else {
                                console.log("呼び出しマッチなし");
                                result = false;
                            }
                            console.log(result);
                        }
                    }
                }
            }
            if(result){
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