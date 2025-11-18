import { ModuleList, CallModuleAndFuncList } from '../../types/ModuleList';
import fs from 'fs';
import { funcNameIdentifiers } from '../../utils/funcNameIdentifiers';
import * as path from 'path';

//呼び出したモジュール，ファイル，ライブラリ名
export const getImportAndPath = (filePath: string): CallModuleAndFuncList[] => {
  const code = fs.readFileSync(filePath, 'utf8');
  const result: ModuleList[] = [];
  const importRegex = /from\s+['"`](.*?)['"`]/;
  const requireRegex = /require\(['"`](.*?)['"`]\)/;
  const lines = code.split('\n');
  lines.filter((line) => line.length < 400);
  const importLines: string[] = lines.filter((line) => /import|require/.test(line) && !/^\s*\/\//.test(line));
  //console.log(importLines);
  //行単位でimport , requireを分類
  for (const line of importLines) {
    if (/import|require/.test(line) && !/^\s*\/\//.test(line)) {
      const importMatch = line.match(importRegex);
      if (importMatch && importMatch[1].length > 0) {
        result.push({ code: line.trim(), modulename: importMatch[1], path: filePath });
      } else {
        const requireMatch = line.match(requireRegex);
        if (requireMatch && requireMatch[1].length > 0) {
          result.push({ code: line.trim(), modulename: requireMatch[1], path: filePath });
        }
      }
    }
  }
  return get_perFunc(result);
};
//ModuleList[]を関数単位にインポートしたソフトウェア名と関数名の情報を追加
const get_perFunc = (moduleList: ModuleList[]): CallModuleAndFuncList[] => {
  const result: CallModuleAndFuncList[] = [];
  moduleList.forEach((moduleInfo) => {
    const funcNames = funcNameIdentifiers(moduleInfo.code, moduleInfo.modulename);
    funcNames.forEach((funcName) => {
      result.push({ code: moduleInfo.code, call_modulename: moduleInfo.modulename, funcname: funcName, path: moduleInfo.path });
    });
  });
  return result;
};
//関数単位までデータを抽出
export const get_perFunc_importAndPath = (filePath: string): CallModuleAndFuncList[] => {
  const code = fs.readFileSync(filePath, 'utf8');
  const result: CallModuleAndFuncList[] = [];
  const importRegex = /from\s+['"`](.*?)['"`]/;
  const requireRegex = /require\(['"`](.*?)['"`]\)/;
  const lines = code.split('\n');
  lines.filter((line) => line.length < 400);
  const importLines: string[] = lines.filter((line) => /import|require/.test(line) && !/^\s*\/\//.test(line));
  //console.log(importLines);
  for (const line of importLines) {
    if (/import|require/.test(line) && !/^\s*\/\//.test(line)) {
      const importMatch = line.match(importRegex);
      if (importMatch && importMatch[1].length > 0) {
        const funcNames = funcNameIdentifiers(line.trim(), importMatch[1]);
        funcNames.forEach((element) => {
          result.push({ code: line.trim(), call_modulename: importMatch[1], funcname: element, path: filePath });
        });
      } else {
        const requireMatch = line.match(requireRegex);
        if (requireMatch && requireMatch[1].length > 0) {
          const funcNames = funcNameIdentifiers(line.trim(), requireMatch[1]);
          funcNames.forEach((element) => {
            result.push({ code: line.trim(), call_modulename: requireMatch[1], funcname: element, path: filePath });
          });
        }
      }
    }
  }
  //funcNameIdentifiers
  return result;
};
console.log(get_perFunc_importAndPath(path.resolve('./getImportAndPath.ts')));
console.log(getImportAndPath(path.resolve('./getImportAndPath.ts')));