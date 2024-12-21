import fs from 'fs';
import path from "path";
import {DetectionOutput, MatchClientPattern} from '../types/outputTypes';
import { getAllFiles } from "../utils/getAllFiles";
import { getSubDir } from "../utils/getSubDir";
import { jsonconfStr } from "../utils/jsonconf";
import output_json from "../utils/output_json";
import {countPatterns} from '../patternOperations/patternCount';
import {patternMatch, allPatternMatch} from "../patternOperations/patternMatch";
import { useAst } from "./useAst";

//単一検出 mode = 0 ,重複検出 mode =1
export const detectByPattern = async (matchDir: string,libName:string,detectPattern:string[][][],mode:number = 0): Promise<MatchClientPattern[]>=>{
    let notest:number = 0;
    let standard:number = 0;
    let noscript:number = 0;
    let noPackagejson:number = 0 ;
    let noClientTestNum:number = 0;

    let matchCliantPatternJson: MatchClientPattern[] =[]
    let countmatchedpatterns:string[][][] = [];
    let sumDetectClient:number = 0;
    
    const matchAlldirs: string[] = await getSubDir(matchDir);
    console.log('matchAlldirs:',matchAlldirs.length);
    for(const subdir of matchAlldirs) {
        let test:string = jsonconfStr(subdir);
        //npm testで実行できるテストがない場合
        if(test !== 'client' && test !== 'standard'){
            if (test === 'no test') {
                notest++;
            } else if(test === 'no scripts'){
                noscript++
            } else if(test === 'noPackage.json'){
                noPackagejson++
            }
            noClientTestNum++;
        }else{
            // if (test === 'standard') {
            //     standard++
            // }
            let match_extract_pattern: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            match_extract_pattern = await useAst(allFiles, libName);
            // console.log(match_extract_pattern);
            if(match_extract_pattern.length > 0) {
                if(mode == 0){
                    const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, detectPattern);
                    if(isMatch && matchedPattern) {
                        matchCliantPatternJson.push({
                            client: subdir,
                            pattern: match_extract_pattern,
                            detectPattern: [matchedPattern]
                        });
                        countmatchedpatterns = countmatchedpatterns.concat([matchedPattern]);
                        if (test === 'standard') {
                            standard++
                        }
                        sumDetectClient++;
                    }
                }else{
                    const [isMatch, matchedPattern]: [boolean, string[][][] | null] = await allPatternMatch(match_extract_pattern, detectPattern);
                    if(isMatch && matchedPattern) {
                        matchCliantPatternJson.push({
                            client: subdir,
                            pattern: match_extract_pattern,
                            detectPattern: matchedPattern
                        });
                        countmatchedpatterns = countmatchedpatterns.concat(matchedPattern);
                        sumDetectClient++;
                    }
                }
            }
        }
    }
    const search_patterns = JSON.parse(JSON.stringify(countmatchedpatterns));
    let detectedUserPattern = countPatterns(search_patterns);
    detectedUserPattern.sort((a, b) => b.count - a.count);
    
    //出力
    const outputDirectory = path.resolve(__dirname, '../../output');
    output_json.createOutputDirectory(outputDirectory);
    const totalCount = detectedUserPattern.reduce((acc, item) => acc + item.count, 0);
    const output1:DetectionOutput = { patterns: detectedUserPattern,totalCount: totalCount};
    //検出に使ったパターンの検出数
    //fs.writeFileSync(output_json.getUniqueOutputPath(outputDirectory,path.basename(matchDir),'Detectioncount'), JSON.stringify(output1, null, 4));
    //検出対象
    //fs.writeFileSync(output_json.getUniqueOutputPath(outputDirectory,path.basename(matchDir),'matchResults'), JSON.stringify(matchCliantPatternJson, null, 2), 'utf8');
    
    //標準出力
    console.log('standard or eslint:'+standard+' notest:'+notest+' noscript:'+noscript+' nopackage.json:'+noPackagejson);
    console.log('sumDetectClient'+sumDetectClient);
    return matchCliantPatternJson;
}