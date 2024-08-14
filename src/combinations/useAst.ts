import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "../utils/funcNameIdentifiers";
import { extractImportLines } from "../utils/extractImportLines";
import { analyzeFile } from "../utils/analyzeFile";
import { analyzeAst,argplace } from "../astRelated/analyzeAst";
import { getArgAst } from '../astRelated/getArgAst';

export const useAst = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    let pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();
    //抽象化時の番号　ファイルを超えても区別するため
    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
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
            for (const line of lines) {
                let name:string[] = funcNameIdentifiers(line, libName);
                if (name.length > 0) {
                    funcName = funcName.concat(name);
                    for(const one of funcName){
                        const secUseFuncnames = secfuncNameIdentifiers(one, fileContent);
                        if(secUseFuncnames.length>0){
                            funcName = funcName.concat(secUseFuncnames);
                        }
                    }
                }
            }
            if (funcName.length > 0) {
                const uniquefuncName: string[] = [...new Set(funcName)];
                for(const one of uniquefuncName){
                    let result:string[] = await analyzeAst(filePath,one);
                    if (result.length > 0) {
                        //mockImplementationの対策 配列で削除 除外
                        const checkstr = 'mockImplementation';
                        //除外
                        //result = result.filter(subresult => !subresult.includes(checkstr));
                        
                        for(const subresult of result){
                            if(subresult.includes(checkstr)){
                                return [];
                            }
                        }
                        inFileStr = inFileStr.concat(result);
                    }
                }
                //重複を考慮
                if(inFileStr.length > 0){
                    let uniqueInFileStr: string[] = [...new Set(inFileStr)];
                    pattern.push(uniqueInFileStr);
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }

        //文字数が異常に多いものを削除
        for (let i = 0; i < pattern.length; i++) {
            for (let j = pattern[i].length - 1; j >= 0; j--) {
                if (pattern[i][j].length > 400) {
                    //要素を削除
                    pattern[i].splice(j, 1);
                }
            }
        }
        //空のサブ配列を削除
        pattern = pattern.filter(subArray => subArray.length > 0);
    }
    for (let i = 0;i < pattern.length;i++) {
        pattern[i] = pattern[i].map(item => item.trim().replace(/\s+/g, ' '));
    }
    if (pattern.length > 0) {
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] && pattern[i].length > 0) {
                for (let j = 0; j < pattern[i].length; j++) {
                    if (typeof pattern[i][j] === 'string') {
                        pattern[i][j] = pattern[i][j].replace(/[\r\n]/g, '');
                        pattern[i][j] = pattern[i][j].replace(/^,|,$/g, '');
                    }
                }
            }
        }
    }
    return pattern;
}
export const abstuseAst = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    let pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();
    //抽象化時の番号　ファイルを超えても区別するため
    let j = 1;
    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
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
            for (const line of lines) {
                let name:string[] = funcNameIdentifiers(line, libName);
                if (name.length > 0) {
                    funcName = funcName.concat(name);
                    for(const one of funcName){
                        const secUseFuncnames = secfuncNameIdentifiers(one, fileContent);
                        if(secUseFuncnames.length>0){
                            funcName = funcName.concat(secUseFuncnames);
                        }
                    }
                }
            }
            if (funcName.length > 0) {
                //重複を削除
                const uniquefuncName: string[] = [...new Set(funcName)];
                for(const one of uniquefuncName){
                    let result:string[] = await analyzeAst(filePath,one);
                    //let result:string[] = await argplace(filePath,one);
                    //文字列が使用された場合のみ最終結果に追加
                    if (result.length > 0) {
                        //mockImplementationの対策 配列で削除 
                        const checkstr = 'mockImplementation';
                        for(const subresult of result){
                            if(subresult.includes(checkstr)){
                                return [];
                            }
                        }
                        result = result.filter(subresult => !subresult.includes(checkstr));
                        inFileStr = inFileStr.concat(result);
                    }
                }
                if(inFileStr.length > 0){
                    const base = "---";
                    let uniqueInFileStr: string[] = [...new Set(inFileStr)];
                    //抽象
                    let sortUniquefuncName = uniquefuncName.sort((a, b) => b.length - a.length);
                    for(const one of sortUniquefuncName){
                        let replaceString: string = base  + j.toString();
                        const regex = new RegExp(`(?<!["'])${one}(?!["'])`, 'g');
                        uniqueInFileStr = uniqueInFileStr.map(str => str.replace(regex, replaceString));
                        j++;
                    }
                    pattern.push(uniqueInFileStr);
                    //pattern.push(inFileStr);
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }

        //文字数が異常に多いものを削除
        for (let i = 0; i < pattern.length; i++) {
            for (let j = pattern[i].length - 1; j >= 0; j--) {
                if (pattern[i][j].length > 400) {
                    //要素を削除
                    pattern[i].splice(j, 1);
                }
            }
        }
        //空のサブ配列を削除
        pattern = pattern.filter(subArray => subArray.length > 0);
    }
    //空白削除　/t等も削除
    for (let i = 0; i < pattern.length; i++) {
        pattern[i] = pattern[i].map(item => item.trim().replace(/\s+/g, ' '));
    }
    if (pattern.length > 0) {
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] && pattern[i].length > 0) {
                for (let j = 0; j < pattern[i].length; j++) {
                    if (typeof pattern[i][j] === 'string') {
                        pattern[i][j] = pattern[i][j].replace(/[\r\n]/g, '');
                        pattern[i][j] = pattern[i][j].replace(/^,|,$/g, '');
                    }
                }
            }
        }
    }
    //語尾の;の削除　).系にまでマッチするので残す
    // for (let i = 0; i < pattern.length; i++) {
    //     for (let j = 0; j < pattern[i].length; j++) {
    //         if (pattern[i][j].endsWith(';')) {
    //             pattern[i][j] = pattern[i][j].slice(0, -1);
    //         }
    //     }
    // }

    return pattern;
}