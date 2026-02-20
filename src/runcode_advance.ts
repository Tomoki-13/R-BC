import path from 'path';

import { createPattern, createOnlyCall } from "./core/createPattern";
import output_json from "./utils/output_json";
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';
import { MatchClientPattern, PatternCount } from './types/OutputTypes';
import { detectByPattern, support_detectByPattern } from './core/detectByPattern';

// シンプルな実行例
(async () => {
  const getPatternDir: string = "../allrepos/repos_globby_800_failure";
  const detectPatternDir: string = "../allrepos/repos_globby_800_success";
  const libName: string = "globby";

  //出力先準備
  const now = new Date();
  const date = output_json.formatDateTime(now);
  let outputDir: string = path.resolve(process.cwd(), '../output/testSample/' + date + '/' + libName);
  let create_outputDir = outputDir + '/createPattern';
  let detect_outputDir = outputDir + '/detectByPattern';
  output_json.createOutputDirectory(create_outputDir);
  output_json.createOutputDirectory(detect_outputDir);

  //パターン作成
  const lastpatterns: ExtractFunctionCallsResult[][][] = (await createPattern(getPatternDir, libName, create_outputDir)).convertedPattern;

  let matchCliantPatternJson = await detectByPattern(detectPatternDir, libName, lastpatterns, detect_outputDir);
  // let matchCliantPatternJson: PatternCount[] = await support_detectByPattern(create_outputDir, detectPatternDir, libName, lastpatterns, detect_outputDir);

})();