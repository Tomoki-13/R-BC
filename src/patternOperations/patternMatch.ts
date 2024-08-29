//パターンマッチング用関数
import patternConversion from "./patternConversion";
export const patternMatch = async (userpatterns: string[][], respattern: string[][][]): Promise<[boolean, string[][] | null]> => {
    //配列の要素を変えることを想定して
    let search_patterns = JSON.parse(JSON.stringify(respattern));
    search_patterns = patternConversion.abstStr(search_patterns);
    try {
        for(const search_pattern of search_patterns) {
            //現在の search_pattern が全て userpatterns に一致するかどうかを示すフラグ
            //let patternMatched = true;

            // search_pattern 全体の variableMap を作成
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
                            const keys = Object.keys(variableMap);
                            if(keys.length === 1) {
                                const key = keys[0];
                                if(variableMap[key].length === 1) {
                                    // console.log('variableMapJudge');
                                    // console.log(variableMapJudge);
                                    return [true, search_pattern];
                                }
                            } else if(variableMap[key].length === 1) {
                                variableMapJudge[key] = true;
                            }
                            for(let i = 1; i < variableMap[key].length; i++) {
                                let functionCallPatternStr = variableMap[key][i].replace(key, importName);
                                //抽象化 
                                //functionCallPatternStr = functionCallPatternStr.replace(/\((.*?)\)/g, (_, inner) => inner ? "(.*?)" : "()");
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
                    // console.log('variableMapJudge');
                    // console.log(variableMapJudge);
                    return [true, search_pattern];
                }
            }

            if(Object.values(variableMapJudge).every(value => value === true)) {
                // console.log('variableMapJudge');
                // console.log(variableMapJudge);
                return [true, search_pattern];
            }
        }
    } catch (err) {
        console.error('Error readFile:', err);
    }
    return [false, null];
};