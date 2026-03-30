import { createOnlyCall } from "./core/createPattern";
import { DetectionOutput } from './types/OutputTypes';
import { detectByPattern, support_detectByPattern } from "./core/detectByPattern";
import output_json from "./utils/output_json";
import path from 'path';
import { ExtractFunctionCallsResult } from "./types/ExtractFunctionCallsResult";

// シンプルな実行例
(async () => {
  const getPatternDir: string = "../allrepos/repos_globby_700_failure";
  const matchDir: string = "../allrepos/repos_globby_700_success";
  // const libName: string = process.argv[2];
  const libName: string = "globby";
  let lastpatterns: ExtractFunctionCallsResult[][][] = [];


  //出力先準備
  const now = new Date();
  const date = output_json.formatDateTime(now);
  let outputDir: string = path.resolve(process.cwd(), '../output/method/' + date + '/' + libName);
  let create_outputDir = outputDir + '/createPattern';
  let detect_outputDir = outputDir + '/detectByPattern';
  output_json.createOutputDirectory(create_outputDir);
  output_json.createOutputDirectory(detect_outputDir);
  //パターン作成
  lastpatterns = await createOnlyCall(getPatternDir, libName, create_outputDir);

  //検出
  let matchCliantPatternJson: DetectionOutput = await detectByPattern(matchDir, libName, lastpatterns, detect_outputDir, true, 0);

  // let matchCliantPatternJson = await support_detectByPattern(getPatternDir, matchDir, libName, lastpatterns, detect_outputDir, true, 0);
})();