import patternTransform from "./patternUtils";
import {patternMatch} from './patternMatch';
import patternUtils from './patternUtils';
import patternConversion from "./patternConversion";
//入力の中で収束させる　IntegrationPattern：abststrしていないもの対象
async function processIntegration(newpatterns: string[][][],IntegrationPattern: string[][][]): Promise<string[][][]> {
    let lastpatterns: string[][][] = [];
    for(const subrespattern of newpatterns) {
        if(Array.isArray(subrespattern) && subrespattern.every(Array.isArray)) {
            let tmppattern: string[][][] = JSON.parse(JSON.stringify(IntegrationPattern));
            tmppattern = patternUtils.removeSubpattern(tmppattern, subrespattern);
            //以降変換後
            tmppattern = patternConversion.abstStr(tmppattern);
            let isMatch1: boolean = false;
            let matchedPattern1: string[][] | null = null;

            //すでに収束したものに合うかどうか
            if(lastpatterns.length > 0){
                [isMatch1, matchedPattern1] = await patternMatch(subrespattern,lastpatterns);
                if(isMatch1 && matchedPattern1 && matchedPattern1.length > 0) {
                    lastpatterns.push(matchedPattern1);
                    continue;
                }
            }
            
            let [isMatch2, matchedPattern2]: [boolean, string[][] | null] = await patternMatch(subrespattern, tmppattern);
            let resultstr: string[][] = [];
            if(!isMatch2) {
                //subrespatternがユニーク
                let str:string[][][] =[subrespattern];
                let returnStr:string[][][] = patternConversion.abstStr(str);
                lastpatterns.push(returnStr[0]);
                continue;
            } else if(isMatch2 && matchedPattern2) {
                //集約，リストでまとめた後選別
                let list:string[][][] =[];
                resultstr = matchedPattern2;
                list.push(resultstr);
                while(isMatch2) {
                    tmppattern = patternUtils.removeSubpattern(tmppattern, matchedPattern2);
                    [isMatch2, matchedPattern2] = await patternMatch(subrespattern, tmppattern);
                    if(isMatch2 && matchedPattern2) {
                        resultstr = matchedPattern2;
                        list.push(resultstr);
                    } else {
                        break;
                    }
                }
                if(list.length > 0) {
                    resultstr = findShortest(list);
                    if(!isMatch2 && !isMatch1) {
                        lastpatterns.push(resultstr);
                    }
                }
            }
        }
    }
    return lastpatterns;
}

const findShortest =  (list: string[][][]): string[][] =>{
    let shortestPattern:string[][] = [];
    for(let i = 0;i < list.length; i++){
        if(i == 0){
            shortestPattern = list[0];
        }else{
            if(shortestPattern.length > list[i].length){
                shortestPattern = list[i];
            }else if(shortestPattern.length == list[i].length){
                //[[[],[]] , [[],[]]]
                let listElementSum:number = 0;
                let shortestElementSum:number = 0;
                for(let j = 0;j < list[i].length;j++){
                    listElementSum += list[i][j].length;
                }
                for(let j = 0;j < shortestPattern.length;j++){
                    shortestElementSum += shortestPattern[j].length;
                }
                if(listElementSum < shortestElementSum){
                    shortestPattern = list[i];
                }
            }
        }
    }
    return shortestPattern;
}
export default {
    processIntegration
};