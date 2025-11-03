import fs from 'fs';
import path from "path";
import {DetectionOutput, MatchClientPattern,PatternCount} from '../types/outputTypes';
import { getAllFiles } from "../utils/getAllFiles";
import { getSubDir } from "../utils/getSubDir";
import { jsonconfStr } from "../utils/jsonconf";
import output_json from "../utils/output_json";
import {countPatterns} from '../patternOperations/patternCount';
import {patternMatch, allPatternMatch} from "../patternOperations/patternMatch";
import { useAst } from "./useAst";
import { combinePatterns } from '../patternOperations/patternCount';

//単一検出 mode = 0 ,重複検出 mode =1
export const detectByPattern = async (matchDir: string,libName:string,detectPattern:string[][][],outputDir:string,mode:number = 0): Promise<DetectionOutput>=>{
    let notest:number = 0;
    let standard:number = 0;
    let noscript:number = 0;
    let noPackagejson:number = 0 ;

    let matchCliantPatternJson: MatchClientPattern[] =[]
    let countmatchedpatterns:string[][][] = [];
    let sumDetectClient:number = 0;
    
    const matchAlldirs: string[] = await getSubDir(matchDir);
    for(const subdir of matchAlldirs) {
        let test:string = jsonconfStr(subdir);
        let match_extract_pattern: string[][] = [];
        const allFiles: string[] = await getAllFiles(subdir);
        match_extract_pattern = await useAst(allFiles, libName);
        // console.log(match_extract_pattern);
        if(match_extract_pattern.length > 0) {
            if(mode == 0){
                const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, detectPattern);
                if(isMatch && matchedPattern) {
                    // console.log(subdir);
                    matchCliantPatternJson.push({
                        client: subdir,
                        pattern: match_extract_pattern,
                        detectPattern: [matchedPattern]
                    });
                    countmatchedpatterns = countmatchedpatterns.concat([matchedPattern]);
                    if(test === 'standard') {
                        standard++
                    }else if(test === 'no test') {
                        notest++;
                    } else if(test === 'no scripts'){
                        noscript++
                    } else if(test === 'noPackage.json'){
                        noPackagejson++
                    }
                    sumDetectClient++;
                }
            }else if(mode == 1){
                const [isMatch, matchedPattern]: [boolean, string[][][] | null] = await allPatternMatch(match_extract_pattern, detectPattern);
                if(isMatch && matchedPattern) {
                    matchCliantPatternJson.push({
                        client: subdir,
                        pattern: match_extract_pattern,
                        detectPattern: matchedPattern
                    });
                    countmatchedpatterns = countmatchedpatterns.concat(matchedPattern);
                    if(test === 'standard') {
                        standard++
                    }else if(test === 'no test') {
                        notest++;
                    } else if(test === 'no scripts'){
                        noscript++
                    } else if(test === 'noPackage.json'){
                        noPackagejson++
                    }
                    sumDetectClient++;
                }
            }
            // if(test === 'standard') {
            //     //console.log('standard',subdir);
            //     standard++
            // }else if(test === 'no test') {
            //     //console.log('no test',subdir);
            //     notest++;
            // } else if(test === 'no scripts'){
            //     //console.log('no scripts',subdir);
            //     noscript++
            // } else if(test === 'noPackage.json'){
            //     //console.log('no scripts',subdir);
            //     noPackagejson++
            // }
        }
    }
    const search_patterns = JSON.parse(JSON.stringify(countmatchedpatterns));
    let detectedUserPattern = countPatterns(search_patterns);
    detectedUserPattern.sort((a, b) => b.count - a.count);
    
    //出力
    const output1:DetectionOutput = { patterns: detectedUserPattern,totalClients: sumDetectClient};
    //検出対象
    // fs.writeFileSync(output_json.getUniqueOutputPath(outputDir,path.basename(matchDir),'detect'), JSON.stringify(detectedUserPattern, null, 2), 'utf8');
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir,path.basename(matchDir),'matchResults'), JSON.stringify(matchCliantPatternJson, null, 2), 'utf8');
    
    if(matchDir.includes('success')){
        console.log('============detect success==========');
    }else if(matchDir.includes('failure')){
        console.log('============detect failure==========');
    } else {
        console.log('============================');
    }
    console.log('matchDir:',matchDir);
    console.log('detectedUsedPattern:',detectedUserPattern.length);
    console.log('nopackage.json:'+noPackagejson+' noscript:'+noscript+'notest:'+notest+'standard or eslint:'+standard);
    console.log('alldirs:',matchAlldirs.length);
    console.log('sumDetectClient:',sumDetectClient);
    console.log('=================================');
    return output1;
}
//重複を許して検出し，テストが失敗した方も検出対象としている
export const support_detectByPattern = async (
    failureDir: string,
    successDir: string,
    libName:string,
    detectPattern:string[][][],
    outputDir:string
): Promise<PatternCount[]>=>{
    //テスト失敗からパターンによって検出
    const failureResult:DetectionOutput = await detectByPattern(failureDir,libName,detectPattern,outputDir,1);
    // テスト成功からパターンによって検出
    const successResult:DetectionOutput = await detectByPattern(successDir,libName,detectPattern,outputDir,1);
    // 全クライアントにおけるパターンの検出結果
    let combineClient:PatternCount[] = combinePatterns(failureResult.patterns,successResult.patterns);
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir,path.basename(failureDir),'detect'), JSON.stringify(failureResult, null, 2), 'utf8');
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir,path.basename(successDir),'detect'), JSON.stringify(successResult, null, 2), 'utf8');
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDir,path.basename(successDir+'combine'),'preCount'), JSON.stringify(combineClient, null, 2), 'utf8');
    return combineClient;
}