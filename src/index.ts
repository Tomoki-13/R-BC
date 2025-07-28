import { createPattern } from "./combinations/createPattern";
import { support_detectByPattern } from "./combinations/detectByPattern";
import {PatternCount} from './types/outputTypes';
import output_json from "./utils/output_json";
import fs from 'fs';
import path from 'path';

(async () => {
    // __dirname は現在のスクリプトのディレクトリ
    const failurePath = path.resolve(__dirname, '../datasets/');
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

    for(let i = 0 ; i < 1 ; i++){
        const getPatternDir: string = failureArray[i];
        const matchDir: string = successArray[i];
        // console.log("getPatternDir", getPatternDir);
        const libName: string = libNameArray[i];

        //出力先準備
        let outputDir:string = path.resolve(process.cwd(), '../output/versionData/' + date + '/' + libName);
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