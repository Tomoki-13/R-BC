import path from 'path';

import { createPatternAdvance } from "./core/argAndMethod/createPatternAdvance";
import output_json from "./utils/output_json";
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';
import { MatchClientPatternAdvance, PatternCountAdvance, DetectionOutputAdvance } from './types/Advance';
import { detectByPatternAdvance, support_detectByPatternAdvance} from './core/argAndMethod/detectByPatternAdvance';

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
  const lastpatterns: ExtractFunctionCallsResult[][][] = await createPatternAdvance(getPatternDir, libName, create_outputDir);
  let matchCliantPatternJson: DetectionOutputAdvance = await detectByPatternAdvance(detectPatternDir, libName, lastpatterns, detect_outputDir);
  // let matchCliantPatternJson: PatternCountAdvance[] = await support_detectByPatternAdvance(create_outputDir, detectPatternDir, libName, lastpatterns, detect_outputDir);

})();