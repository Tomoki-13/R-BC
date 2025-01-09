import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";
import { extractImportLines } from "../../utils/extractImportLines";
import { analyzeFile } from './analyzeFile';
//mode=0　全て返す　mode = 1 関数名だけ返す
export const add_funcName = async (allFiles: string[],libName:string,mode:number = 0): Promise<string[][]> => {
    let pattern: string[][] = [];
    for(const filePath of allFiles) {
        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent,libName);
            let inFileStr:string[]=[];
            if(lines.length>0 && mode === 0){
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
            const uniquefuncName: string[] = [...new Set(funcName)];
            if(mode === 1){
                if(uniquefuncName.length>0){
                    pattern.push(uniquefuncName);
                }
                continue;
            }
            if(funcName.length > 0 && mode === 0) {
                //機能に関連する行を全て抜き出す
                let result:string[] = await analyzeFile(uniquefuncName,fileContent,libName);
                if(result.length > 0) {
                    inFileStr = inFileStr.concat(result);
                }
            }
            if(inFileStr.length > 0) {
                pattern.push(inFileStr);
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    if(mode === 0 ||mode === 1){
        return pattern;
    }else{
        console.log('mode error');
        return [];
    }
}