import fs from 'fs';
import { TargetInput } from '../types/TargetInput';

interface TestRecord {
  L__nameWithOwner: string;
  L__version: string;
  L__npm_pkg: string;
  S__nameWithOwner: string;
  state: string;
}

/**
 * SemVer 文字列を比較する。プレリリース版（beta等）は同パッチの正規版より古い扱い。
 */
function compareSemVer(a: string, b: string): number {
  const parse = (v: string) => {
    const dashIdx = v.indexOf('-');
    const main = dashIdx > -1 ? v.slice(0, dashIdx) : v;
    const pre = dashIdx > -1 ? v.slice(dashIdx + 1) : '';
    return { parts: main.split('.').map(Number), pre };
  };

  const vA = parse(a);
  const vB = parse(b);

  for (let i = 0; i < Math.max(vA.parts.length, vB.parts.length); i++) {
    const diff = (vA.parts[i] || 0) - (vB.parts[i] || 0);
    if (diff !== 0) return diff;
  }
  if (vA.pre && !vB.pre) return -1;
  if (!vA.pre && vB.pre) return 1;
  if (vA.pre && vB.pre) return vA.pre.localeCompare(vB.pre, undefined, { numeric: true, sensitivity: 'base' });
  return 0;
}

/**
 * targets.json ファイルから TargetInput[] を読み込む。
 * @param filePath targets.json のパス
 */
export function loadTargetsFromFile(filePath: string): TargetInput[] {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TargetInput[];
}

/**
 * test_result.json から有効なアップデートペアを抽出して TargetInput[] を返す。
 * 抽出条件: 同一クライアントで旧バージョンが success かつ新バージョンが存在するペア。
 * SemVer 順ソートを適用し隣接バージョンのペアのみを対象とする。
 * @param testResultPath test_result.json のパス
 */
export function loadTargetsFromTestResult(testResultPath: string): TargetInput[] {
  const testResults: TestRecord[] = JSON.parse(fs.readFileSync(testResultPath, 'utf-8'));

  const updatesMap = new Map<string, TargetInput>();
  const libClientMap = new Map<string, Map<string, TestRecord[]>>();

  for (const record of testResults) {
    const lib = record.L__nameWithOwner;
    const client = record.S__nameWithOwner;
    if (!libClientMap.has(lib)) libClientMap.set(lib, new Map());
    const clientMap = libClientMap.get(lib)!;
    if (!clientMap.has(client)) clientMap.set(client, []);
    clientMap.get(client)!.push(record);
  }

  for (const [, clientMap] of libClientMap.entries()) {
    for (const [, records] of clientMap.entries()) {
      const versions = [...new Set(records.map(r => r.L__version))].sort(compareSemVer);

      for (let i = 0; i < versions.length - 1; i++) {
        const oldV = versions[i];
        const newV = versions[i + 1];
        const hasOldSuccess = records.some(r => r.L__version === oldV && r.state === 'success');

        if (hasOldSuccess) {
          const key = `${records[0].L__nameWithOwner}_${oldV}_${newV}`;
          if (!updatesMap.has(key)) {
            const libName =
              records.find(r => r.L__version === newV)?.L__npm_pkg ?? records[0].L__npm_pkg;
            updatesMap.set(key, { libName, preVersion: oldV, postVersion: newV });
          }
        }
      }
    }
  }

  // 同一 libName + postVersion の重複を除去（cleanVersion が同じになるペア）
  return Array.from(
    new Map([...updatesMap.values()].map(t => [`${t.libName}_${t.postVersion}`, t])).values()
  );
}
