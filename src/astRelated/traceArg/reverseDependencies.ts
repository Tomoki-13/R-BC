import { OutboundFileDependencies, InboundFunctionDependencies, DependencyInfo } from '../../types/FileDependencies';
import { getFileRelated } from './getFileRelated';
import { getAllFiles } from '../../utils/getAllFiles';
import * as path from 'path';

//あるファイルが呼び出されているファイルを網羅的に取得する例：AがBとCに呼び出されている)
export function reverseDependencies(fileDeps: OutboundFileDependencies[]): InboundFunctionDependencies[] {
  const reverseMap: Map<string, { filepath: string; callers: Map<string, Set<string>> }> = new Map();

  for (const { filepath: callerFile, dependence } of fileDeps) {
    for (const { dep_filepath: calleeFile, functions } of dependence) {
      for (const func of functions) {
        // 関数名 + 定義ファイルで一意に識別
        const key = `${func}@@${calleeFile}`;
        if (!reverseMap.has(key)) {
          reverseMap.set(key, {
            filepath: calleeFile,
            callers: new Map(),
          });
        }

        const entry = reverseMap.get(key)!;
        if (!entry.callers.has(callerFile)) {
          entry.callers.set(callerFile, new Set());
        }
        entry.callers.get(callerFile)!.add(func); // 呼び出し元のファイルと関数名（仮）
      }
    }
  }

  // Map → InboundFunctionDependencies[] へ変換
  const result: InboundFunctionDependencies[] = [];
  for (const [key, { filepath, callers }] of reverseMap.entries()) {
    const [funcNameInFilepath] = key.split('@@');
    const dependence: DependencyInfo[] = [];

    for (const [dep_filepath, funcSet] of callers.entries()) {
      dependence.push({
        dep_filepath,
        functions: Array.from(funcSet),
      });
    }

    result.push({
      funcNameInFilepath,
      filepath,
      dependence,
    });
  }

  return result;
}

(async () => {
  const absolutePath = path.resolve('../rangeArg');
  const allpath: string[] = await getAllFiles(absolutePath);
  const groupedDependencies = getFileRelated(allpath);
  console.log(JSON.stringify(groupedDependencies, null, 2));
  // 依存関係を逆転させる
  const reversed = reverseDependencies(groupedDependencies);
  console.log(JSON.stringify(reversed, null, 2));
})();
