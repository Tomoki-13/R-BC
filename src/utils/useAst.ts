import fsPromises from 'fs/promises';
import { funcNameIdentifiers, secfuncNameIdentifiers } from "./funcNameIdentifiers";
import { extractImportLines } from "./extractImportLines";
import { analyzeFile } from "./analyzeFile";
import { analyzetsAst, analyzetsAstFuncName } from "./analyzetsAst";

export const useAst = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    const pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);

        try {
            const fileContent:string = await fsPromises.readFile(filePath, 'utf8');
            const lines:string[] = extractImportLines(fileContent, libName);

            for (const line of lines) {
                let funcName:string[] = funcNameIdentifiers(line, libName);
                if (funcName.length > 0) {
                    for(const one of funcName){
                        analyzetsAst(fileContent,libName,one);
                    }
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}

export const useAstSample = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    const pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);
        
        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent,libName);
            //const lines = await analyzetsAstFuncName(filePath,libName);
            if(lines.length>0){
                // console.log(lines);
                pattern.push(lines);
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
                //console.log('funcName:'+funcName);
                // console.log('unifuncName:'+uniquefuncName);
                for(const one of uniquefuncName){
                    //console.log(one);
                    let result = await analyzetsAst(filePath, libName, one);
                    if (result.length > 0) {
                        //console.log('result:'+result);
                        //.mockImplementationの対策
                        // const str1 = libName + '.mockImplementation';
                        // result = result.filter(line => !line.includes(str1));
                        pattern.push(...result);
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