import path from 'path';

import { createPatternAdvance } from "./core/argAndMethod/createPatternAdvance";
import output_json from "./utils/output_json";
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';

// シンプルな実行例
(async () => {
  const getPatternDir: string = "../allrepos/repos_globby_700_failure";
  // const libName: string = process.argv[2];
  const libName: string = "globby";
  let lastpatterns: ExtractFunctionCallsResult[][][] = [];


  //出力先準備
  const now = new Date();
  const date = output_json.formatDateTime(now);
  let outputDir: string = path.resolve(process.cwd(), '../output/testSample/' + date + '/' + libName);
  let create_outputDir = outputDir + '/createPatternAdvance';
  output_json.createOutputDirectory(create_outputDir);
  //パターン作成
  lastpatterns = await createPatternAdvance(getPatternDir, libName, create_outputDir);
})();