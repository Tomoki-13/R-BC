import output_json from "./utils/output_json";
import fs from 'fs';
import path from 'path';

import { createPattern } from "./core/createPattern";
import { detectByPattern, support_detectByPattern } from './core/detectByPattern';
import { ExtractFunctionCallsResult } from './types/ExtractFunctionCallsResult';
import { DetectionOutput, PatternCount } from './types/OutputTypes';
/**
 * 関数の説明：パターンの生成とそれによる検出を行うコード
 * failurePath パターン生成に使いたいクライアントのディレクトリパズの集合
 * successPath 検出に使いたいクライアントのディレクトリパズの集合
 * libNamePath ライブラリ名の集合
 */

(async () => {
  // __dirname は現在のスクリプトのディレクトリ
  const failurePath = path.resolve(__dirname, '../datasets/input/clientRepo_failure.json');
  const successPath = path.resolve(__dirname, '../datasets/input/clientRepo_success.json');
  const libNamePath = path.resolve(__dirname, '../datasets/input/libName.json');

  // JSONファイルの中身を読み込んでパース
  let failureArray: string[] | undefined = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));
  let successArray: string[] = JSON.parse(fs.readFileSync(successPath, 'utf-8'));
  let libNameArray: string[] = JSON.parse(fs.readFileSync(libNamePath, 'utf-8'));
  if (!failureArray || !successArray || !libNameArray) {
    console.error('Error: One of the JSON files is empty or not found.');
    return;
  }

  // 出力先のパスを取得
  const now = new Date();
  const date = output_json.formatDateTime(now);

  console.log('libNameArray', libNameArray.length);
  for (let i = 0; i < failureArray.length; i++) {
    const getPatternDir: string = failureArray[i];
    const detectPatternDir: string = successArray[i];
    const libName: string = libNameArray[i];

    //出力先準備
    let outputDir: string = path.resolve(process.cwd(), '../output/type-method/' + date + '/' + output_json.extractMiddleFlexible(path.basename(getPatternDir), 'repos_'));
    let create_outputDir = outputDir + '/createPattern';
    let detect_outputDir = outputDir + '/detectByPattern';
    output_json.createOutputDirectory(create_outputDir);
    output_json.createOutputDirectory(detect_outputDir);

    console.log('-----------' + failureArray[i] + '-----------');
    let lastpatterns: ExtractFunctionCallsResult[][][] = [];
    //パターン作成
    lastpatterns = (await createPattern(getPatternDir, libName, create_outputDir)).convertedPattern;

    //検出
    // let matchCliantPatternJson: DetectionOutput = await detectByPattern(detectPatternDir, libName, lastpatterns, detect_outputDir, false, 1);
    let matchCliantPatternJson: PatternCount[] = await support_detectByPattern(getPatternDir, detectPatternDir, libName, lastpatterns, detect_outputDir, true, 1);

    console.log('--------------------------------------------');
  }
})();
