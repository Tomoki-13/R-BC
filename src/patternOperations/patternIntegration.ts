import patternTransform from "./patternUtils";
import {patternMatch} from './patternMatch';
import patternUtils from './patternUtils';
//入力の中で収束させる
async function processIntegration(newpatterns: string[][][],subnewpatterns: string[][][]): Promise<string[][][]> {
    let lastpatterns: string[][][] = [];
    for(const subrespattern of newpatterns) {
        if(Array.isArray(subrespattern) && subrespattern.every(Array.isArray)) {
            let tmppattern: string[][][] = JSON.parse(JSON.stringify(subnewpatterns));
            //subrespattern以外でマッチするものを探すために削除
            tmppattern = patternUtils.removeSubpattern(tmppattern, subrespattern);
            let isMatch1: boolean = false;
            let matchedPattern1: string[][] | null = null;
            if(lastpatterns.length > 0){
                [isMatch1, matchedPattern1] = await patternMatch(subrespattern,lastpatterns);
                //すでに収束したものに合うかどうか
                if(isMatch1 && matchedPattern1 && matchedPattern1.length > 0) {
                    lastpatterns.push(matchedPattern1);
                    continue;
                }
            }

            let [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(subrespattern, tmppattern);
            let resultstr: string[][] = [];

            if(!isMatch) {
                lastpatterns.push(subrespattern);
                continue;
            } else if(isMatch && matchedPattern) {
                resultstr = matchedPattern;
                if(matchedPattern.length > subrespattern.length || 
                (matchedPattern.length === subrespattern.length && 
                    matchedPattern.some((arr, i) => arr.length > subrespattern[i].length))) {
                    tmppattern = patternUtils.removeSubpattern(tmppattern, matchedPattern);
                    continue;
                }
            }

            //resultstrを使用して収束処理を行う
            tmppattern = patternUtils.removeSubpattern(tmppattern, resultstr);

            while(isMatch) {
                [isMatch, matchedPattern] = await patternMatch(resultstr, tmppattern);
                if(isMatch && matchedPattern) {
                    if(matchedPattern.length > resultstr.length || 
                    (matchedPattern.length === resultstr.length && matchedPattern.some((arr, i) => arr.length > resultstr[i].length))) {
                        tmppattern = patternUtils.removeSubpattern(tmppattern, matchedPattern);
                        continue;
                    }
                    resultstr = matchedPattern;
                    tmppattern = patternUtils.removeSubpattern(tmppattern, resultstr);
                } else {
                    break;
                }
            }

            if(!isMatch && !isMatch1) {
                lastpatterns.push(resultstr);
            }
        }
    }

    //---の番号違いの解消
    if(lastpatterns.length > 0) {
        let tmppattern: string[][][] = JSON.parse(JSON.stringify(lastpatterns));
        tmppattern = patternUtils.removeDuplicate(tmppattern);
        let changes: { before: string[][], after: string[][] }[] = [];
        for(let i = 0; i < tmppattern.length; i++) {
            changes.push(patternUtils.alignNumbersInPattern(tmppattern[i]));
        }

        //元のパターンから変更前のものを見つけて置換
        let updatedPatterns: string[][][] = JSON.parse(JSON.stringify(lastpatterns));
        for(let i = 0; i < updatedPatterns.length; i++) {
            for(let change of changes) {
                if(JSON.stringify(updatedPatterns[i]) === JSON.stringify(change.before)) {
                    updatedPatterns[i] = change.after;
                }
            }
        }
        lastpatterns = updatedPatterns;
    }

    return lastpatterns;
}
//パターンの数を維持したまま小さいものへ簡易変換
async function processPatterns(respattern: string[][][]): Promise<string[][][]> {
    const newpatterns: string[][][] = [];
    for(const subrespattern of respattern) {
        let tmppattern: string[][][] = JSON.parse(JSON.stringify(respattern));
        tmppattern = patternTransform.removeSubpattern(tmppattern, subrespattern);
        const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(subrespattern, tmppattern);
        if(isMatch && matchedPattern) {
            newpatterns.push(matchedPattern);
        } else {
            newpatterns.push(subrespattern);
        }
    }
    return newpatterns;
}

export default {
    processPatterns,
    processIntegration
};