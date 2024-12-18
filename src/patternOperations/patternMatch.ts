//パターンマッチング用関数　userpatterns対象　respattern検出用
import patternConversion from "./patternConversion";
export const patternMatch = async (userpatterns: string[][], respattern: string[][][]): Promise<[boolean, string[][] | null]> => {
    //配列の要素を変えることを想定して
    let search_patterns:string[][][] = JSON.parse(JSON.stringify(respattern));
    try {
        for(const search_pattern of search_patterns) {
            //search_pattern 全体の variableMap を作成
            const variableMap: { [key: string]: string[] } = {};
            for(const search_one of search_pattern) {
                for(const str of search_one) {
                    const match = str.match(/variable(\d+)/g);
                    if(match) {
                        const key = match[0];
                        if(!variableMap[key]) {
                            variableMap[key] = [];
                        }
                        variableMap[key].push(str);
                    }
                }
            }

            //判定用
            const variableMapJudge: { [key: string]: boolean } = {};
            for(const key in variableMap) {
                if(variableMap.hasOwnProperty(key)) {
                    variableMapJudge[key] = false;
                }
            }
            
            for(const userpattern of userpatterns) {
                //他のループに影響を与えないように配列を複製
                const variableMapCopy = JSON.parse(JSON.stringify(variableMap));
                //variableMap内の全てのパターンが一致するか確認する
                for(const key in variableMapCopy) {
                    if(variableMapCopy.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(patternConversion.escapeFunc(variableMapCopy[key][0]));
                        let importMatch: RegExpMatchArray | null = null;
                        //マッチした要素の次から以降マッチングするため
                        let num: number = 0;
                        for(const line of userpattern) {
                            importMatch = line.match(regex1);
                            num++;
                            if(importMatch) {
                                break;
                            }
                        }

                        if(importMatch && importMatch?.groups) {
                            //他のkeyでinteropRequireDefaultがある場合の置換
                            const importName = importMatch.groups[key];
                            for(const key1 in variableMapCopy){
                                for(let i = 0; i < variableMapCopy[key1].length; i++){
                                    if(!(key1 == key && i == 0)){
                                        variableMapCopy[key1][i] = variableMapCopy[key1][i].replace(key, importName);
                                    }
                                }
                            }
                            // console.log('importMatch.groups[key]',importMatch.groups[key]);
                            // console.log('variableMapCopy',variableMapCopy);
                            //interopRequireDefaultがある場合に最初の要素は1つだけのことがある
                            if(variableMapCopy[key].length == 1){
                                variableMapJudge[key] = true;
                                continue;
                            }
                            for(let i = 1; i < variableMapCopy[key].length; i++) {
                                let functionCallPatternStr = variableMapCopy[key][i].replace(key, importName);
                                //抽象化 
                                const functionCallPattern = new RegExp(patternConversion.escapeFunc(functionCallPatternStr));
                                let matched = false;
                                for(let j = num; j < userpattern.length; j++) {
                                    //userpattern[j]に[]がある時の処理
                                    let replaceuserpattern = userpattern[j].replace(/[\r\n]/g, '');
                                    replaceuserpattern = userpattern[j].replace(/\[[^\]]*\]/g, 'argument');
                                    //userpattern[j]に{}がある時の処理
                                    replaceuserpattern = replaceuserpattern.replace(/\{[^}]*\}/g, 'argument');
                                    const functionCallMatch = replaceuserpattern.match(functionCallPattern);
                                    if(functionCallMatch) {
                                        //一致が見つかった場合
                                        matched = true;
                                        break;
                                    } else {
                                        //一致が見つからない場合
                                        matched = false;
                                    }
                                }
                                if(!matched) {
                                    variableMapJudge[key] = false;
                                    break;
                                }
                                if(i == variableMapCopy[key].length - 1 && matched){
                                    variableMapJudge[key] = true;
                                }
                            }
                        } else {
                            variableMapJudge[key] = false;
                        }
                        if(variableMapJudge[key] == false) {
                            break;
                        }
                    }
                }
                //現在の search_pattern が一致
                if(Object.values(variableMapJudge).every(value => value === true)) {
                    return [true, search_pattern];
                }
            }

            if(Object.values(variableMapJudge).every(value => value === true)) {
                return [true, search_pattern];
            }
        }
    } catch (err) {
        console.error('Error readFile:', err);
    }
    return [false, null];
};
//重複許容バージョン
export const allPatternMatch = async (userpatterns: string[][], respattern: string[][][]): Promise<[boolean, string[][][] | null]> => {
    let search_patterns:string[][][] = JSON.parse(JSON.stringify(respattern));
    let retrun_searchPattern:string[][][] = [];
    try {
        for(const search_pattern of search_patterns) {
            //search_pattern 全体の variableMap を作成
            const variableMap: { [key: string]: string[] } = {};
            for(const search_one of search_pattern) {
                for(const str of search_one) {
                    const match = str.match(/variable(\d+)/g);
                    if(match) {
                        const key = match[0];
                        if(!variableMap[key]) {
                            variableMap[key] = [];
                        }
                        variableMap[key].push(str);
                    }
                }
            }

            //判定用
            const variableMapJudge: { [key: string]: boolean } = {};
            for(const key in variableMap) {
                if(variableMap.hasOwnProperty(key)) {
                    variableMapJudge[key] = false;
                }
            }
            
            for(const userpattern of userpatterns) {
                const variableMapCopy = JSON.parse(JSON.stringify(variableMap));
                for(const key in variableMapCopy) {
                    if(variableMapCopy.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(patternConversion.escapeFunc(variableMapCopy[key][0]));
                        let importMatch: RegExpMatchArray | null = null;
                        let num: number = 0;
                        for(const line of userpattern) {
                            importMatch = line.match(regex1);
                            num++;
                            if(importMatch) {
                                break;
                            }
                        }

                        if(importMatch && importMatch?.groups) {
                            const importName = importMatch.groups[key];
                            for(const key1 in variableMapCopy){
                                for(let i = 0; i < variableMapCopy[key1].length; i++){
                                    if(!(key1 == key && i == 0)){
                                        variableMapCopy[key1][i] = variableMapCopy[key1][i].replace(key, importName);
                                    }
                                }
                            }
                            //interopRequireDefaultがある場合に最初の要素は1つだけのことがある
                            if(variableMapCopy[key].length == 1){
                                variableMapJudge[key] = true;
                                continue;
                            }
                            for(let i = 1; i < variableMapCopy[key].length; i++) {
                                let functionCallPatternStr = variableMapCopy[key][i].replace(key, importName);
                                //抽象化 
                                const functionCallPattern = new RegExp(patternConversion.escapeFunc(functionCallPatternStr));
                                let matched = false;
                                for(let j = num; j < userpattern.length; j++) {
                                    let replaceuserpattern = userpattern[j].replace(/[\r\n]/g, '');
                                    replaceuserpattern = userpattern[j].replace(/\[[^\]]*\]/g, 'argument');
                                    //userpattern[j]に{}がある時の処理
                                    replaceuserpattern = replaceuserpattern.replace(/\{[^}]*\}/g, 'argument');
                                    const functionCallMatch = replaceuserpattern.match(functionCallPattern);
                                    if(functionCallMatch) {
                                        matched = true;
                                        break;
                                    } else {
                                        matched = false;
                                    }
                                }
                                if(!matched) {
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
                        if(variableMapJudge[key] == false) {
                            break;
                        }
                    }
                }
                if(Object.values(variableMapJudge).every(value => value === true)) {
                    retrun_searchPattern.push(search_pattern);
                }
            }
        }
    } catch (err) {
        console.error('Error readFile:', err);
    }
    if(retrun_searchPattern.length > 0){
        return [true, retrun_searchPattern];
    }
    return [false, null];
};