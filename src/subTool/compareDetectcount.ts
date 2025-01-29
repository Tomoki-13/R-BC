import * as fs from 'fs';
import { PatternCount,DetectionOutput } from "../types/outputTypes";
//jsonファイルを読み込んでパターンを比較するツール
(async () => {
    const getPatternDir1: string = "../../compare/";
    const getPatternDir2: string = "../../compare/";

    let pattern1:DetectionOutput = loadJSON(getPatternDir1);
    let pattern2:DetectionOutput= loadJSON(getPatternDir2);
    comparePatterns(pattern1.patterns,pattern2.patterns);


})();

function loadJSON(filePath: string):DetectionOutput {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

//パターンを比較
export function comparePatterns(pattern1:PatternCount[],pattern2:PatternCount[]): void {
    const pattern1_Map = new Map<string, number>();
    //pattern1のMap作成
    for(const pattern1_i of pattern1) {
        const patternString = JSON.stringify(pattern1_i.pattern);
        if(pattern1_Map.has(patternString)){
            console.log('combinePatterns_error');
        }
        pattern1_Map.set(patternString, pattern1_i.count);
    }

    for(const pattern2_i of pattern2) {
        const patternString = JSON.stringify(pattern2_i.pattern);
        if(!pattern1_Map.has(patternString)) {
            console.log('patternString',patternString);
        }
    }
}