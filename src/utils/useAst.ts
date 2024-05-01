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
            let funcName:string[] = await analyzetsAstFuncName(filePath, libName);
            if (funcName.length > 0) {
                //console.log(funcName);
                for(const one of funcName){
                    //console.log(one);
                    let result = await analyzetsAst(filePath, libName, one);
                    if (result.length > 0) {
                        //console.log(result);
                        pattern.push(...result);
                    }
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}