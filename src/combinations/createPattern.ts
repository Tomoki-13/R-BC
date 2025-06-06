import fs from 'fs';
import path from "path";
import { useAst } from "./useAst";
import { checkAst } from "../astRelated/checkAst";
import {countPatterns} from '../patternOperations/patternCount';
import { getAllFiles } from "../utils/getAllFiles";
import { getSubDir } from "../utils/getSubDir";
import {JsonRow, PatternCount, DetectionOutput} from '../types/outputTypes';
import output_json from "../utils/output_json";
import { processPatterns } from "./processPatterns";
import patternUtils from '../patternOperations/patternUtils';

//作成処理
export const createPattern = async (patternDir: string,libName:string): Promise<string[][][]>=>{
    let JsonRows:JsonRow[] = [];
    let respattern: string[][][] = [];
    //クライアントのディレクトリを抽出
    const alldirs: string[] = await getSubDir(patternDir);
    for(const subdir of alldirs) {
        let extract_pattern1: string[][] = [];
        let judge:boolean = true;
        const allFiles: string[] = await getAllFiles(subdir);
        //Astが作れないファイルがあればクライアントを除外
        for(const file of allFiles){
            if(await checkAst(file) === false){
                judge = false;
                break;
            }
        }
        if(judge === false){
            continue;
        }

        extract_pattern1 = await useAst(allFiles, libName,1);
        if(extract_pattern1.length > 0) {
            //呼び出しだけのもの削除(呼び出しだけの場合，空配列)
            let judgeArray = await patternUtils.removeCallOnly([extract_pattern1]);
            if(judgeArray.length > 0 && judgeArray[0].length > 0) {
                JsonRows.push({
                    failureclient: subdir,
                    detectPatterns: extract_pattern1
                });
                respattern.push(extract_pattern1);
            }
        }
    }
    //集約 重複あり
    let lastpatterns = await processPatterns(respattern);

    //ファイル出力
    const outputDirectory = path.resolve(__dirname, '../../output');
    //fs.writeFileSync(output_json.getUniqueOutputPath(outputDirectory,path.basename(patternDir),'rawpattern'), JSON.stringify(JsonRows, null, 4), 'utf8');
    let mergepattern: PatternCount[] = countPatterns(lastpatterns);

    mergepattern.sort((a, b) => b.count - a.count);
    const totalCount2 = mergepattern.reduce((acc, item) => acc + item.count, 0);
    const output2:DetectionOutput = {patterns: mergepattern,totalClients: totalCount2};
    if (mergepattern) {
        fs.writeFileSync(output_json.getUniqueOutputPath(outputDirectory,path.basename(patternDir),'detectpatternlist'), JSON.stringify(output2, null, 4), 'utf8');
    }
    //lastpatternsを一意にする
    lastpatterns = patternUtils.removeDuplicate(lastpatterns);
    
    //標準出力
    console.log('failure alldirs',alldirs.length);
    console.log('make failure pattern',respattern.length);
    console.log('lastapatterns',lastpatterns.length);
    return lastpatterns;
}