import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";
import { extractImportLines } from "../../utils/extractImportLines";
const lodash = require('lodash');
import { analyzeAst,argplace } from "../../astRelated/analyzeAst";

export const useAst = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    const pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);
        
        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent,libName);
            let returnStr:string[][] = [];
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
                        result = result.filter(subresult => !subresult.includes(checkstr));
                        inFileStr = inFileStr.concat(result);
                        const uniqueInFileStr: string[] = [...new Set(inFileStr)];
                        //重複を考慮
                        returnStr.push(uniqueInFileStr);
                        pattern.push(...returnStr);
                    }
                }
            }

           
        } catch (err) {
            console.error('Error readFile:', err);
        }

        //文字数が以上に多いものを置き換え
        for(let i=0;pattern.length>i;i++){
            for(let j=0;pattern[i].length>j;j++){
                if(pattern[i][j].length>150){
                    //console.log('pattern:'+pattern[i][j]);
                    pattern[i][j]= 'error';
                }
            }
        }
    }
    return pattern;
}