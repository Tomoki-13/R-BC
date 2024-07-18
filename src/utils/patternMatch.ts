export const patternMatch = async (patterns: string[][], libName: string, search_patterns: string[][][]): Promise<boolean> => {
    let result: boolean = false;
    for(const pattern of patterns){
        for(const search_pattern of search_patterns){
            for(const one of search_pattern){
                let serp:string[] = prep_repl(one);
                //当てる処理　呼び出しかどうかの判定をしてその場合には最初の処理次に２つ目の処理
            }
        }
    }
    return result;
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