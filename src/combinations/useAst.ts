import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "../utils/funcNameIdentifiers";
import { extractImportLines } from "../utils/extractImportLines";
import { analyzeAst } from "../astRelated/analyzeAst";
import { getExceptionModule } from '../astRelated/getExceptionModule';
import patternConversion from '../patternOperations/patternConversion';
import patternUtils from '../patternOperations/patternUtils';
//createPattern用(抽象化あり) mode = 1,detectByPattern用 mode = 0
export const useAst = async (allFiles: string[], libName: string,mode:number = 0): Promise<string[][]> =>{
    let pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();
    //抽象化時の番号　ファイルを超えても区別するため
    let j = 1;
    for(const filePath of allFiles) {
        if(visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);
        
        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent,libName);
            let inFileStr:string[]=[];
            if(lines.length>0){
                inFileStr = inFileStr.concat(lines);
            }
            //関数の使用部分の抽出
            let funcName:string[] = [];
            for(const line of lines) {
                let name:string[] = funcNameIdentifiers(line, libName);
                if(name.length > 0) {
                    funcName = funcName.concat(name);
                    for(const one of funcName){
                        const secUseFuncnames = secfuncNameIdentifiers(one, fileContent);
                        if(secUseFuncnames.length>0){
                            funcName = funcName.concat(secUseFuncnames);
                        }
                    }
                }
            }
            if(funcName.length > 0) {
                const uniquefuncName: string[] = [...new Set(funcName)];
                for(const one of uniquefuncName){
                    let result:string[] = await analyzeAst(filePath,one);
                    //let result:string[] = await argplace(filePath,one);
                    if(result.length > 0) {
                        if(mode === 1){
                            //パターン作成時に抜けが起こるため mock除外(return [])する
                            const checkstr = 'mock';
                            for(const subresult of result){
                                if(subresult.includes(checkstr)){
                                    return [];
                                }
                            }
                            //module.export.~~を除外 引数の時に一緒に追跡
                            let except_str:string[] = await getExceptionModule(filePath,one);
                            if(except_str.length > 0){
                                return [];
                            }
                        }
                        inFileStr = inFileStr.concat(result);
                    }
                }
                if(inFileStr.length > 0){
                    if(mode === 0){
                        let uniqueInFileStr: string[] = [...new Set(inFileStr)];
                        pattern.push(uniqueInFileStr);
                    }else if(mode === 1){
                        //let const var削除
                        const letregex = /^\s*(?:let|const|var)/;
                        for(let k = 0; k < inFileStr.length; k++){
                            inFileStr[k] = inFileStr[k].replace(letregex, '').trimStart();
                        }

                        //抽象化
                        const base = "---";
                        let sortUniquefuncName = uniquefuncName.sort((a, b) => b.length - a.length);
                        let uniqueInFileStr: string[] = [...new Set(inFileStr)];
                        for(const one of sortUniquefuncName){
                            let replaceString: string = base  + j.toString();
                            let mainregex = new RegExp(`(?<!["\`'])${one}(?!["\`'])`, 'g');
                            for(let k = 0; k < uniqueInFileStr.length;k++){
                                //特殊処理：{}呼び出し系
                                if(/import|require/.test(uniqueInFileStr[k]) && !/^\s*\/\//.test(uniqueInFileStr[k])&&/\{.*\}/.test(uniqueInFileStr[k])){
                                    //asと:の場合で条件分け　　(?<!["\`'])は"や`の前後(文字列)にマッチしないように
                                    let regex1 = new RegExp(`:\\s*(?<!["\`'])${one}(?!["\`'])`, 'g');
                                    let regex2 = new RegExp(`as\\s*(?<!["\`'])${one}(?!["\`'])`, 'g');
                                    if(regex1.test(uniqueInFileStr[k]) || regex2.test(uniqueInFileStr[k])){
                                        uniqueInFileStr[k] = uniqueInFileStr[k].replace(mainregex, replaceString);
                                    }
                                }else{
                                    uniqueInFileStr[k] = uniqueInFileStr[k].replace(mainregex, replaceString);
                                }
                            }
                            j++;
                        }
                        pattern.push(uniqueInFileStr);
                    }
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }

        for(let i = 0; i < pattern.length; i++) {
            for(let j = pattern[i].length - 1; j >= 0; j--) {
                if(pattern[i][j].length > 400) {
                    pattern[i].splice(j, 1);
                }
            }
        }
        pattern = pattern.filter(subArray => subArray.length > 0);
    }

    if(pattern.length > 0) {
        for(let i = 0; i < pattern.length; i++) {
            if(pattern[i] && pattern[i].length > 0) {
                for(let j = 0; j < pattern[i].length; j++) {
                    if(typeof pattern[i][j] === 'string') {
                        pattern[i][j] = pattern[i][j].replace(/[\r\n]/g, '');
                        pattern[i][j] = pattern[i][j].replace(/^,|,$/g, '');
                    }
                }
            }
        }
    }
    //末尾の;削除
    for(let i = 0; i < pattern.length; i++) {
        for(let j = 0; j < pattern[i].length; j++) {
            if(pattern[i][j].endsWith(';')) {
                pattern[i][j] = pattern[i][j].slice(0, -1);
            }
        }
    }
    
    // //要素が１のものを配列から削除：不要な呼び出しをするクライアントがあるため，
    // pattern = pattern.filter(subArray => subArray.length > 1);

    //空白削除　/t等も削除
    for(let i = 0;i < pattern.length;i++) {
        pattern[i] = pattern[i].map(item => item.trim().replace(/\s+/g, ' '));
        //クライアント内でのパターンの重複統合
        if (mode == 1) {
            const replacement = "tmp";
            let tmp_pattern = pattern.map(subPattern =>
                subPattern.map(item =>item.replace(/---(\d+)/g, replacement))
            );
            let index: number[] = []; 
            //一致するインデックスのペアを調査
            for (let j = 0; j < tmp_pattern.length; j++) {
                for (let k = j + 1; k < tmp_pattern.length; k++) {
                    if (isCompareElement(tmp_pattern[j], tmp_pattern[k])) {
                        if(tmp_pattern[j].length > tmp_pattern[k].length){
                            index.push(k);
                        }else if(tmp_pattern[j].length < tmp_pattern[k].length || tmp_pattern[j].length === tmp_pattern[k].length){
                            index.push(j);
                        }
                    }
                }
            }
            index.sort((a, b) => b - a);
            index = [...new Set(index)];
            if(index.length > 0) {
                for(const index_i of index) {
                    pattern.splice(index_i, 1);
                }
            }
        }
    }
    //番号整理
    pattern = patternUtils.alignNumbersInPattern(pattern).after;
    return pattern;
}

//長さが異なる場合は false 
function isCompareElement(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length){
        let long:string[] = [];
        let short:string[] = [];
        if(arr1.length < arr2.length){
            long = arr2;
            short = arr1;
        }else{
            long = arr1;
            short = arr2;
        }
        if(isEqualCheck(short,long)){
            return true;
        }
    }else{
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }
    return false;
}

function isEqualCheck(short: string[], long: string[]): boolean {
    let judge:boolean[] = [];
    for(let i = 0; i < short.length; i++){
        judge.push(false);
    }
    //longの要素にshortの要素が全て含まれているか
    for(let i = 0; i < short.length; i++){
        for(let j = 0; j < long.length; j++){
            if(short[i] === long[j]){
                judge[i] = true;
                break;
            }
        }
    }
    return judge.every(val => val);
}