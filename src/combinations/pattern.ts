import patternUtils from '../patternOperations/patternUtils';
import patternIntegration from '../patternOperations/patternIntegration';
//pattrnの処理をまとめたもの
export async function processPatterns(respatternwp: string[][][]): Promise<string[][][]> {
    let lastpatterns: string[][][] = [];
    //呼び出しだけのもの削除
    respatternwp = patternUtils.removeCallOnly(respatternwp);
    respatternwp = patternUtils.sortRespattern(respatternwp);
    let subnewpatterns: string[][][] = JSON.parse(JSON.stringify(respatternwp));
    subnewpatterns = patternUtils.removeDuplicate(subnewpatterns);
    lastpatterns = await patternIntegration.processIntegration(respatternwp, subnewpatterns);
    let nextPatterns: string[][][] = JSON.parse(JSON.stringify(lastpatterns));
    lastpatterns = nextPatterns;
    return lastpatterns;
}