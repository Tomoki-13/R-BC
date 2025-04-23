import patternUtils from '../patternOperations/patternUtils';
import patternIntegration from '../patternOperations/patternIntegration';
//pattrnの処理をまとめたもの respattern:---数字まとめられている
export async function processPatterns(respattern: string[][][]): Promise<string[][][]> {
    let lastpatterns: string[][][] = [];
    respattern = patternUtils.sortRespattern(respattern);
    let subnewpatterns: string[][][] = JSON.parse(JSON.stringify(respattern));
    subnewpatterns = patternUtils.removeDuplicate(subnewpatterns);
    lastpatterns = await patternIntegration.processIntegration(respattern, subnewpatterns);
    return lastpatterns;
}