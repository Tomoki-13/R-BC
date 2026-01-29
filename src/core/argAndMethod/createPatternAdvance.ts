import fs from 'fs';
import path from "path";
import { useAstAdvance } from "./useAstAdvance";
import { checkAst } from "../../astRelated/base/checkAst";
import { getAllFiles } from "../../utils/getAllFiles";
import { getSubDir } from "../../utils/getSubDir";
import output_json from "../../utils/output_json";
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import patternConversion from '../../patternOperations/patternConversion';

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
      // 呼び出しのみのものを除外
      // TODO: removeCallonlyに通せるように調整する(呼び出しだけのものを除外するように調整)
      const hasContent = extract_pattern1.some(fileResult => fileResult.length > 0);
      let flag = false;
      for(const pattern of extract_pattern1){
        if(pattern.length > 1) flag = true;
      }

      if (hasContent && flag) {
        JsonRows.push({
          failureclient: subdir,
          detectPatterns: extract_pattern1
        });
        respattern.push(extract_pattern1);
      }
    }
  }
  // TODO: パターンの集約や重複排除,パターンへの変換は未実装
  //abstStrの再構築

  // ファイル出力 (rawpattern)
  const outputPath = output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'rawpattern');
  fs.writeFileSync(outputPath, JSON.stringify(JsonRows, null, 4), 'utf8');

  const lastpatterns = patternConversion.typeAwareAbstStr(respattern);
  const outputPath2 = output_json.getUniqueOutputPath(outputDir, path.basename(patternDir), 'patternList');
  fs.writeFileSync(outputPath2, JSON.stringify(lastpatterns, null, 4), 'utf8');
  // 標準出力
  console.log('========== createPattern (Raw Output) ============');
  console.log('failure alldirs:', alldirs.length);
  console.log('make failure pattern (clients):', respattern.length);
  console.log('Raw Output saved to:', outputPath);
  console.log('pattern:', outputPath2);
  console.log('==================================================');

  return lastpatterns;
}