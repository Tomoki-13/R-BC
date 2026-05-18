import { typeAwarePatternMatch } from './typeAwarePatternMatch';
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';

// パターン内の総関数呼び出し数を返す
function totalCallCount(pattern: ExtractFunctionCallsResult[][]): number {
  return pattern.reduce((sum, fileGroup) => sum + fileGroup.length, 0);
}

// JSON 完全一致による重複除去
function deduplicateExact(
  patterns: ExtractFunctionCallsResult[][][]
): ExtractFunctionCallsResult[][][] {
  const seen = new Set<string>();
  return patterns.filter(p => {
    const key = JSON.stringify(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 型情報を考慮したパターン集約。
 *
 * 短い（より一般的な）パターンが長い（より具体的な）パターンを包含する場合、
 * 長い方を冗長とみなして削除する。
 * 包含判定には typeAwarePatternMatch を使用し、mode に応じた型比較を適用する。
 *
 * @param patterns 集約前のパターン一覧
 * @param mode マッチングモード（1=型完全一致 / 2=objectキー部分一致）
 */
export async function aggregateTypedPatterns(
  patterns: ExtractFunctionCallsResult[][][],
  mode: number
): Promise<ExtractFunctionCallsResult[][][]> {
  const deduped = deduplicateExact(patterns);

  // 短い順にソート（より一般的なパターンを先に評価）
  deduped.sort((a, b) => totalCallCount(a) - totalCallCount(b));

  const aggregated: ExtractFunctionCallsResult[][][] = [];

  for (const pattern of deduped) {
    let covered = false;
    for (const existing of aggregated) {
      // existing（短い）が pattern（長い）を包含するか確認
      const [isMatch] = await typeAwarePatternMatch(pattern, [existing], mode);
      if (isMatch) {
        covered = true;
        break;
      }
    }
    if (!covered) {
      aggregated.push(pattern);
    }
  }

  return aggregated;
}
