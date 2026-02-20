import path from "path";
import fs from 'fs';
import output_json from "../utils/output_json";
import { DetectionOutput } from "../types/OutputTypes";
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";
import { detectByPattern } from "../core/detectByPattern";
import patternConversion from "../patternOperations/patternConversion";
type dataType = {
  libName: string;
  pattrnListPath: string;
  targetDir: string;
}
// DetectionOutputからパターンを抽出する関数
function extractAllPatterns(detectionOutput: DetectionOutput): ExtractFunctionCallsResult[][][] {
  return detectionOutput.patterns.map(p => p.pattern);
}
// specific_data：クライアントで特定のバージョンを超えたものを対象
// 更新後のクライアントに対してパターン検出を実行
(async () => {
  // let absolutePath = path.resolve(__dirname, '../../datasets/input/specific/specific_data.json');
  let absolutePath = path.resolve(__dirname, '../../datasets/input/');
  let data: dataType[] = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));

  const now = new Date();
  const date = output_json.formatDateTime(now);

  for (const { libName, pattrnListPath, targetDir } of data) {
    let outputDir: string = path.resolve(process.cwd(), '../../output/specific/' + date + '/' + libName);
    let detect_outputDir = outputDir + '/detectByPattern';
    output_json.createOutputDirectory(detect_outputDir);
    let patternListAndcount: DetectionOutput = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../' + pattrnListPath), 'utf-8'));
    let patternList: ExtractFunctionCallsResult[][][] = extractAllPatterns(patternListAndcount);
    console.log(`ライブラリ: ${libName} - パターン数: ${patternList.length}`);
    console.log(`ターゲットディレクトリ: ../${targetDir}`);
    let matchCliantPatternJson: DetectionOutput = await detectByPattern(targetDir, libName, patternList, detect_outputDir, true, 0);
  }
})();

