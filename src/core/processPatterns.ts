import patternUtils from '../patternOperations/patternUtils';
import patternIntegration from '../patternOperations/patternIntegration';
import patternConversion from '../patternOperations/patternConversion';

//pattrnの処理をまとめたもの respattern:---数字まとめられている
export async function processPatterns(respattern: string[][][]): Promise<string[][][]> {
  let lastpatterns: string[][][] = [];

  respattern = patternUtils.sortRespattern(respattern);
  let subnewpatterns: string[][][] = respattern.map(arr2d => arr2d.map(arr1d => [...arr1d]));
  subnewpatterns = patternUtils.removeDuplicate(subnewpatterns);
  
  lastpatterns = await patternIntegration.processIntegration(respattern, subnewpatterns);
  lastpatterns = patternConversion.deduplicateFinalPatterns(lastpatterns);

  return lastpatterns;
}