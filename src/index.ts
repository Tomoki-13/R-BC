import { createPattern } from "./combinations/createPattern";
import { support_detectByPattern } from "./combinations/detectByPattern";
import {DetectionOutput} from './types/outputTypes';
import {PatternCount} from './types/outputTypes';
import { detectByPattern } from "./combinations/detectByPattern";
import output_json from "./utils/output_json";
import fs from 'fs';
import path from 'path';
/**
 * 関数の説明：パターンの生成とそれによる検出を行うコード
 * failurePath パターン生成に使いたいクライアントのディレクトリパズの集合
 * successPath 検出に使いたいクライアントのディレクトリパズの集合
 * libNamePath ライブラリ名の集合
 */
(async () => {
    // __dirname は現在のスクリプトのディレクトリ
    const failurePath = path.resolve(__dirname, '../datasets');
    const successPath = path.resolve(__dirname, '../datasets/');
    const libNamePath = path.resolve(__dirname, '../datasets/');

    // JSONファイルの中身を読み込んでパース
    let failureArray: string[] | undefined = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));
    let successArray: string[] = JSON.parse(fs.readFileSync(successPath, 'utf-8'));
    let libNameArray: string[] = JSON.parse(fs.readFileSync(libNamePath, 'utf-8'));
    if(!failureArray || !successArray || !libNameArray){
        console.error('Error: One of the JSON files is empty or not found.');
        return;
    }

    // 出力先のパスを取得
    const now = new Date();
    const date = output_json.formatDateTime(now);

    for(let i = 0 ; i < failureArray.length ; i++){
        const getPatternDir: string = failureArray[i];
        const matchDir: string = successArray[i];
        // console.log("getPatternDir", getPatternDir);
        const libName: string = libNameArray[i];

        //出力先準備
        let outputDir:string = path.resolve(process.cwd(), '../output/' + date + '/' + libName);
        let create_outputDir = outputDir + '/createPattern';
        let detect_outputDir = outputDir + '/detectByPattern';
        output_json.createOutputDirectory(create_outputDir);
        output_json.createOutputDirectory(detect_outputDir);
        
        console.log('-----------'+failureArray[i]+'-----------');
        let lastpatterns: string[][][] = [];
        //パターン作成
        lastpatterns = await createPattern(getPatternDir,libName,create_outputDir);
        //検出
        let result:PatternCount[] = await support_detectByPattern(getPatternDir,matchDir,libName,lastpatterns,detect_outputDir);
        console.log('--------------------------------------------');
    }
})();

//シンプルな実行例
// (async () => {
//     const getPatternDir: string = "../allrepos/";
//     const matchDir: string = ".../allrepos/";
//     const libName: string = process.argv[2];
//     let lastpatterns: string[][][] = [];

//     //出力先準備
//     const now = new Date();
//     const date = output_json.formatDateTime(now);
//     let outputDir:string = path.resolve(process.cwd(), '../output/versionData/' + date + '/' + libName);
//     let create_outputDir = outputDir + '/createPattern';
//     let detect_outputDir = outputDir + '/detectByPattern';
//     output_json.createOutputDirectory(create_outputDir);
//     output_json.createOutputDirectory(detect_outputDir);
//     //パターン作成
//     lastpatterns = await createPattern(getPatternDir,libName,create_outputDir);
//     //検出
//     // let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns);
//     let matchCliantPatternJson:DetectionOutput = await detectByPattern(getPatternDir,libName,lastpatterns,detect_outputDir,1);
// })();