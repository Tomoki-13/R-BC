import { PatternCount } from "../types/outputTypes";
//重複カウント
export function countPatterns(pattern: string[][][]): PatternCount[] {
    const patternMap = new Map<string, number>();
    pattern.forEach(subrespattern => {
        const patternString = JSON.stringify(subrespattern);
        if(patternMap.has(patternString)) {
            patternMap.set(patternString, patternMap.get(patternString)! + 1);
        } else {
            patternMap.set(patternString, 1);
        }
    });

    return Array.from(patternMap.entries()).map(([patternString, count]) => {
        const pattern = JSON.parse(patternString);
        return { pattern, count };
    });
};
//パターンとカウントを結合 pattern1にpattern2を追加
export function combinePatterns(pattern1:PatternCount[],pattern2:PatternCount[]): PatternCount[] {
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
        if(pattern1_Map.has(patternString)) {
            pattern1_Map.set(patternString, pattern1_Map.get(patternString)! + pattern2_i.count);
        } else {
            pattern1_Map.set(patternString, pattern2_i.count);
        }
    }
    let pattern:PatternCount[] = Array.from(pattern1_Map.entries()).map(([patternString, count]) => {
        const pattern:string[][] = JSON.parse(patternString);
        return { pattern, count };
    });
    return pattern.sort((a, b) => b.count - a.count);
}