//パターンを長さでソートする関数
function sortRespattern(respattern: string[][][]): string[][][] {
    respattern.sort((a, b) => a.length - b.length);
    return respattern;
}

//重複要素を削除する関数
function removecase(pattern: string[][][]): string[][][] {
    for(let i = pattern.length - 1; i >= 0; i--) {
        if(Array.isArray(pattern[i])) {
            for(let j = pattern[i].length - 1; j >= 0; j--) {
                if(Array.isArray(pattern[i][j])) {
                    const uniqueElements = [...new Set(pattern[i][j])];
                    pattern[i][j] = uniqueElements;
                    if(pattern[i][j].length === 0) {
                        pattern[i].splice(j, 1);
                    }
                }
            }
            //空なら削除
            if(pattern[i].length === 0) {
                pattern.splice(i, 1);
            }
        }
    }

    //重複パターンの削除 pattern[i][j]
    for(let i = pattern.length - 1; i >= 0; i--) {
        if(Array.isArray(pattern[i])) {
            for(let j = pattern[i].length - 1; j >= 0; j--) {
                if(Array.isArray(pattern[i][j])) {
                    const uniqueElements = [...new Set(pattern[i][j])];
                    pattern[i][j] = uniqueElements;
                    if(pattern[i][j].length === 0) {
                        pattern[i].splice(j, 1);
                    }
                }
            }

            //配列が空なら削除
            if(pattern[i].length === 0) {
                pattern.splice(i, 1);
            }
        }
    }

    //重複パターンの削除 pattern[i]
    const seen = new Map<string, string[][]>();
    for(const subpattern of pattern) {
        const key = JSON.stringify(subpattern);
        if(!seen.has(key)) {
            seen.set(key, subpattern);
        }
    }
    pattern = Array.from(seen.values());
    return pattern;
}

//全体から一意なものを残す
function removeDuplicate(patterns: string[][][]): string[][][] {
    const seen = new Map<string, string[][]>();
    for(const subpattern of patterns) {
        const key = JSON.stringify(subpattern);
        if(!seen.has(key)) {
            seen.set(key, subpattern);
        }
    }
    return Array.from(seen.values());
}

//呼び出しだけのもの削除
function removeCallOnly(pattern: string[][][]): string[][][] {
    for(let i = pattern.length - 1; i >= 0; i--) {
        let isCallOnly = true;

        for(let j = 0; j < pattern[i].length; j++) {
            let allElementsMatch = true;
            for(let k = 0; k < pattern[i][j].length; k++) {
                const element = pattern[i][j][k];
                if(!(element.includes("import") || element.includes("require") || element.includes("_interopRequireDefault"))) {
                    allElementsMatch = false;
                    break;
                }
            }
            if(!allElementsMatch) {
                isCallOnly = false;
                break;
            }
        }

        if(isCallOnly || (pattern[i].length === 1&&pattern[i][0].length === 1)) {
            pattern.splice(i, 1);
        }
    }
    return pattern;
}
//特定のサブパターンを削除
function removeSubpattern(tmppattern: string[][][], subpattern: string[][]): string[][][] {
    const subpatternStr = arrayToString(subpattern);
    return tmppattern.filter(pattern => arrayToString(pattern) !== subpatternStr);
}

function arrayToString(array: string[][]): string {
    return array.map(row => row.join(',')).join(';');
}

//番号の不具合を修正
function alignNumbersInPattern(subpattern: string[][]): { before: string[][], after: string[][] } {
    let newSubpattern: string[][] = [];
    let variableMapping: Map<string, string> = new Map();
    let numberIndex = 1;
    for(let j = 0; j < subpattern.length; j++) {
        newSubpattern.push([]);
        for(let k = 0; k < subpattern[j].length; k++) {
            let before = subpattern[j][k];
            let after = before;
            if(before.match(/(---\d+)/)) {
                let match = before.match(/(---\d+)/);
                if(match) {
                    if(!variableMapping.has(match[1])) {
                        variableMapping.set(match[1], `---${numberIndex++}`);
                    }
                    after = before.replace(match[1], variableMapping.get(match[1])!);
                }
            }
            newSubpattern[j].push(after);
        }
    }

    return { before: subpattern, after: newSubpattern };
}
export default {
    sortRespattern,
    removeDuplicate,
    removeSubpattern,
    alignNumbersInPattern,
    removeCallOnly,
    removecase
};