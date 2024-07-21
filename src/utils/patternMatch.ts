export const patternMatch = async (userpatterns: string[][], libName: string, search_patterns: string[][][]): Promise<boolean> => {
    let result: boolean = true;
    for(const userpattern of userpatterns){
        //検出用を回す
        for(const search_pattern of search_patterns){
            //userpattern > search_patternのいずれか
            //result=true
            result = true;
            for(const search_one of search_pattern){
                let serp:string[] = prep_repl(search_one);
                //当てる処理　呼び出しかどうかの判定をしてその場合には最初の処理次に２つ目の処理
                //特定の用語を含むかどうかでserpを分ける
                const containsKeywords = serp.filter(item => 
                    /require|import|_interopRequire/.test(item)
                );
                const notContainKeywords = serp.filter(item => 
                    !/require|import|_interopRequire/.test(item)
                );
                //variable数字の部分を処理　
                for(const word of userpattern){

                }
                const variableMap: { [key: string]: string[] } = {};
                //{"variable1": [" variable1=require';"]}
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
                for (const key in variableMap) {
                    if (variableMap.hasOwnProperty(key)) {
                        //variableMap[key][0]がマッチするかで後の処理が変わる　interoに関する別処理をどうするか
                        const regex1:RegExp = new RegExp(variableMap[key][0]);
                        let importMatch: RegExpMatchArray | null = null;
                        for (const line of userpattern) {
                            importMatch = line.match(regex1);
                            if (importMatch) {
                                break;
                            }
                        }
                        if (importMatch && importMatch?.groups) {
                            const importName = importMatch.groups[key];
                            console.log("インポートされた名前:", importName);
                            for(let i = 1; i < variableMap[key].length;i++){
                                //動的に関数呼び出しのパターンを作成
                                const functionCallPattern = new RegExp(variableMap[key][i]);
                                console.log(functionCallPattern);
                                //for文でconst line of userpatternで該当した行の後ろに対して処理をする

                                //関数呼び出しのマッチング
                                //const functionCallMatch = line.match(functionCallPattern);
                                // if (functionCallMatch) {
                                //     console.log("関数呼び出しがマッチしました!");
                                // } else {
                                //     console.log("関数呼び出しがマッチしませんでした。");
                                //     result = false;
                                // }
                            }
                        } else {
                            console.log("インポート文がマッチしませんでした。");
                            result = false;
                        }
                    }
                }
            }
            if(result = true){
                return true;
            }
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

            // 初回の場合のみ、正規表現パターンを生成
            if (!firstOccurrences.hasOwnProperty(varName)) {
                firstOccurrences[varName] = true;
                replacedIndexes[varName] = `(?<${varName}>\\w+)`;
                return replacedIndexes[varName];
            } else {
                return `\${importMatch?.groups["${varName}"]}`;
            }
        });
    });
}