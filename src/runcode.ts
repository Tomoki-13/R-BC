import { createPattern } from "./core/method/createPattern";
import { DetectionOutput } from './types/outputTypes';
import { detectByPattern } from "./core/method/detectByPattern";
import output_json from "./utils/output_json";
import fs from 'fs';
import path from 'path';

// シンプルな実行例
(async () => {
  const getPatternDir: string = "../allrepos/";
  const matchDir: string = ".../allrepos/";
  const libName: string = process.argv[2];
  let lastpatterns: string[][][] = [];


  //出力先準備
  const now = new Date();
  const date = output_json.formatDateTime(now);
  let outputDir: string = path.resolve(process.cwd(), '../output/versionData/' + date + '/' + libName);
  let create_outputDir = outputDir + '/createPattern';
  let detect_outputDir = outputDir + '/detectByPattern';
  output_json.createOutputDirectory(create_outputDir);
  output_json.createOutputDirectory(detect_outputDir);
  //パターン作成
  lastpatterns = await createPattern(getPatternDir, libName, create_outputDir);
  //検出
  // let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns);
  let matchCliantPatternJson: DetectionOutput = await detectByPattern(getPatternDir, libName, lastpatterns, detect_outputDir, 1);
})();