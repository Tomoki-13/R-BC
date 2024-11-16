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
            //console.log(variableMap);

            //判定用
            const variableMapJudge: { [key: string]: boolean } = {};
            for(const key in variableMap) {
                if(variableMap.hasOwnProperty(key)) {
                    variableMapJudge[key] = false;
                }
            }
            
            for(const userpattern of userpatterns) {
                //variableMap 内の全てのパターンが一致するか確認する
                for(const key in variableMap) {
                    if(variableMap.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(patternConversion.escapeFunc(variableMap[key][0]));
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
                            for(const key1 in variableMap){
                                for(let i = 0; i < variableMap[key1].length; i++){
                                    if(!(key1 == key && i == 0)){
                                        variableMap[key1][i] = variableMap[key1][i].replace(key, importName);
                                    }
                                }
                            }
                            for(let i = 1; i < variableMap[key].length; i++) {
                                let functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                //抽象化 
                                //functionCallPatternStr = functionCallPatternStr.replace(/\((.*?)\)/g, (_, inner) => inner ? "(.*?)" : "()");
                                const functionCallPattern = new RegExp(patternConversion.escapeFunc(functionCallPatternStr));
                                let matched = false;
                                for(let j = num; j < userpattern.length; j++) {
                                    //マッチングの際にユーザのパターンが複雑なときの影響をとる：引数
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
                //現在の search_pattern が一致
                if(Object.values(variableMapJudge).every(value => value === true)) {
                    return [true, search_pattern];
                }
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
            //console.log(variableMap);

            //判定用
            const variableMapJudge: { [key: string]: boolean } = {};
            for(const key in variableMap) {
                if(variableMap.hasOwnProperty(key)) {
                    variableMapJudge[key] = false;
                }
            }
            
            for(const userpattern of userpatterns) {
                for(const key in variableMap) {
                    if(variableMap.hasOwnProperty(key)) {
                        const regex1: RegExp = new RegExp(patternConversion.escapeFunc(variableMap[key][0]));
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
                            for(const key1 in variableMap){
                                for(let i = 0; i < variableMap[key1].length; i++){
                                    if(!(key1 == key && i == 0)){
                                        variableMap[key1][i] = variableMap[key1][i].replace(key, importName);
                                    }
                                }
                            }
                            for(let i = 1; i < variableMap[key].length; i++) {
                                let functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                //抽象化 
                                //functionCallPatternStr = functionCallPatternStr.replace(/\((.*?)\)/g, (_, inner) => inner ? "(.*?)" : "()");
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