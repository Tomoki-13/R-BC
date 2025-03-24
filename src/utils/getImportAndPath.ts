
import { ModuleList , CallModuleAndFuncList} from "../types/ModuleList";
import fs from 'fs';
import { funcNameIdentifiers } from "./funcNameIdentifiers";
//呼び出したモジュール，ファイル，ライブラリ名
export const getImportAndPath = (path:string): ModuleList[] => {
    const code = fs.readFileSync(path, 'utf8');
    let result:ModuleList[] = [];
    const importRegex = /from\s+['"`](.*?)['"`]/;
    const requireRegex = /require\(['"`](.*?)['"`]\)/;
    let lines = code.split('\n');
    lines.filter(line => line.length < 400);
    let importLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //console.log(importLines);
    //行単位でimport , requireを分類
    for (const line of importLines) {
        if (/import|require/.test(line) && !/^\s*\/\//.test(line)) {
            const importMatch = line.match(importRegex);
            if (importMatch&&importMatch[1].length>0) {
                result.push({ code: line.trim(), modulename: importMatch[1],path });
            } else {
                const requireMatch = line.match(requireRegex);
                if (requireMatch&&requireMatch[1].length>0) {
                    result.push({ code: line.trim(), modulename: requireMatch[1],path });
                }
            }
        }
    }
    //funcNameIdentifiers
    return result; 
}
//get_perFunc_importAndPathに変わってget_importAndPathの出力にかませばいい版
//get_perFunc_importAndPath消して組み込む可能性あり
const get_perFunc = (moduleList:ModuleList[]) : CallModuleAndFuncList[] => {
    let result:CallModuleAndFuncList[] = [];
    moduleList.forEach(moduleInfo => {
        const funcNames = funcNameIdentifiers(moduleInfo.code,moduleInfo.modulename);
        funcNames.forEach(funcName => {
            result.push({code:moduleInfo.code, call_modulename: moduleInfo.modulename,funcname: funcName,path:moduleInfo.path});
        });
    });
    return result;
}
export const get_perFunc_importAndPath = (path:string): CallModuleAndFuncList[] => {
    const code = fs.readFileSync(path, 'utf8');
    let result:CallModuleAndFuncList[] = [];
    const importRegex = /from\s+['"`](.*?)['"`]/;
    const requireRegex = /require\(['"`](.*?)['"`]\)/;
    let lines = code.split('\n');
    lines.filter(line => line.length < 400);
    let importLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //console.log(importLines);
    for (const line of importLines) {
        if (/import|require/.test(line) && !/^\s*\/\//.test(line)) {
            const importMatch = line.match(importRegex);
            if (importMatch&&importMatch[1].length>0) {
                const funcNames = funcNameIdentifiers(line.trim(),importMatch[1]);
                funcNames.forEach(element => {
                    result.push({code:line.trim(), call_modulename: importMatch[1],funcname: element,path});
                });
            } else {
                const requireMatch = line.match(requireRegex);
                if (requireMatch&&requireMatch[1].length>0) {
                    const funcNames = funcNameIdentifiers(line.trim(),requireMatch[1]);
                    funcNames.forEach(element => {
                        result.push({code:line.trim(), call_modulename: requireMatch[1],funcname: element,path});
                    });
                    
                }
            }
        }
    }
    //funcNameIdentifiers
    return result; 
}