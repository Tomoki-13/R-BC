import patternTransform from "./patternUtils";
import {patternMatch} from './patternMatch';
import patternUtils from './patternUtils';
import patternConversion from "./patternConversion";
//入力の中で収束させる　IntegrationPattern：abststrしていないもの対象
//ここでは，収束のためpatternMatchで1つだけをマッチング
//newpatterns：生データ（IntegrationPatternの重複削除前）
//IntegrationPattern：軽く重複を消しただけのデータ

async function processIntegration(newpatterns: string[][][],IntegrationPattern: string[][][]): Promise<string[][][]> {
    let lastpatterns: string[][][] = [];
    if(newpatterns.length === 0) {
        return lastpatterns;
    }
    for(const subrespattern of newpatterns) {
        if(Array.isArray(subrespattern) && subrespattern.every(Array.isArray)) {
            let tmppattern: string[][][] = JSON.parse(JSON.stringify(IntegrationPattern));
            tmppattern = patternUtils.removeSubpattern(tmppattern, subrespattern);
            //IntegrationPatternの正規表現へ変換 これを用いて集約
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
    //検証用ペア確認
    // let tmppattern: string[][][] = JSON.parse(JSON.stringify(newpatterns));
    // tmppattern = patternConversion.abstStr(tmppattern);
    // console.log('newpatterns.len', tmppattern.length);
    // console.log('lastpatterns.len', lastpatterns.length);

    return lastpatterns;
}

//小さい[][]配列を調査
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