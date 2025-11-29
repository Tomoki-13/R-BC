import fs from 'fs';
import path from "path";
import { useAstAdvance } from "./useAstAdvance";
import { checkAst } from "../../astRelated/base/checkAst";
import { getAllFiles } from "../../utils/getAllFiles";
import { getSubDir } from "../../utils/getSubDir";
import output_json from "../../utils/output_json";
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';

interface RawJsonRow {
  failureclient: string;
  detectPatterns: ExtractFunctionCallsResult[][];
}

// 作成処理
export const createPatternAdvance = async (patternDir: string, libName: string, outputDir: string): Promise<ExtractFunctionCallsResult[][][]> => {
  let JsonRows: RawJsonRow[] = [];
  let respattern: ExtractFunctionCallsResult[][][] = [];

  // クライアントのディレクトリを抽出
  const alldirs: string[] = await getSubDir(patternDir);

  for (const subdir of alldirs) {
    let extract_pattern1: ExtractFunctionCallsResult[][] = [];
    let judge: boolean = true;
    const allFiles: string[] = await getAllFiles(subdir);

    // Astが作れないファイルがあればクライアントを除外
    for (const file of allFiles) {
      if (await checkAst(file) === false) {
        judge = false;
        break;
      }
    }
    if (judge === false) {
      continue;
    }

    extract_pattern1 = await useAstAdvance(allFiles, libName, 1);

    if (extract_pattern1.length > 0) {
      // 以前の patternUtils.removeCallOnly などのフィルタリングは
      // TODO: 型が合わない可能性があるため、ここでは簡易的な空チェックのみ行い、統合せずに出力対象とする

      // 少なくとも1つのファイルで抽出結果が存在するか確認
      const hasContent = extract_pattern1.some(fileResult => fileResult.length > 0);

      if (hasContent) {
        JsonRows.push({
          failureclient: subdir,
          detectPatterns: extract_pattern1
        });
        respattern.push(extract_pattern1);
      }
    }
  }
  // TODO: パターンの集約や重複排除は未実装

  // ファイル出力 (rawpattern)
  const outputPath = output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'rawpattern');
  fs.writeFileSync(outputPath, JSON.stringify(JsonRows, null, 4), 'utf8');

  // 標準出力
  console.log('========== createPattern (Raw Output) ============');
  console.log('failure alldirs:', alldirs.length);
  console.log('make failure pattern (clients):', respattern.length);
  console.log('Raw Output saved to:', outputPath);
  console.log('==================================================');

  return respattern;
}