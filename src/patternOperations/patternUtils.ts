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
            //import,require,_interopRequireDefaultが含まれていない要素がある場合
            if(!allElementsMatch) {
                isCallOnly = false;
                break;
            }
        }

        if(isCallOnly || (pattern[i].length === 1 && pattern[i][0].length === 1) || pattern[i].length === 0) {
            pattern.splice(i, 1);
        }
    }
    return pattern;
}

//特定のサブパターンを削除
function removeSubpattern(tmppattern: string[][][], deletePattern: string[][]): string[][][] {
    const subpatternStr = arrayToString(deletePattern);
    return tmppattern.filter(pattern => arrayToString(pattern) !== subpatternStr);
}

function arrayToString(array: string[][]): string {
    return array.map(row => row.join(',')).join(';');
}

//番号の不具合を修正 
function alignNumbersInPattern(pattern: string[][]): { before: string[][], after: string[][] } {
    let  updatedPatterns: string[][] = [];
    let variableMap: Map<string, string> = new Map();
    let numberIndex = 1;
    // ---数字が2つ以上ある行で---数字を置換するとエラーになる可能性あり，tmp数字に変換
    //[ [ "{v1:---3,v5:---4} = require('module')" ] ]から[ [ "{v1:tmp3,v5:tmp4} = require('module')" ] ]
    let normalizedPatterns = pattern.map(row =>
        row.map(item => item.replace(/---(\d+)/g, "tmp$1"))
    );
    for(let i = 0; i < pattern.length; i++) {
        //　'---2' => '---1'のように移行先の数字を決定
        for(let j = 0; j < normalizedPatterns[i].length; j++) {
            let currentLine = normalizedPatterns[i][j];
            let matches = currentLine.matchAll(/tmp\d+/g);
            if(matches) {
                for (let match of matches) {
                    let key = match[0];
                    if (!variableMap.has(key)) {
                        variableMap.set(key, `---${numberIndex++}`);
                    }
                }
            }
        }
        updatedPatterns = normalizedPatterns.map(row => row.map(line => line = convertTmpToFinal(line,variableMap)))
    }
    return { before: pattern, after:  updatedPatterns };
}

//alignNumbersInPattern用のvariableMapをもとにtmp数字を置換する処理
function convertTmpToFinal(line: string, variableMap: Map<string, string>): string {
    let updatedLine = line;
    let match = updatedLine.match(/tmp\d+/);

    while (match) {
        updatedLine = updatedLine.replace(match[0], variableMap.get(match[0])!);
        match = updatedLine.match(/tmp\d+/);
    }
    return updatedLine;
}

export default {
    sortRespattern,
    removeDuplicate,
    removeSubpattern,
    alignNumbersInPattern,
    removeCallOnly,
    removecase
};