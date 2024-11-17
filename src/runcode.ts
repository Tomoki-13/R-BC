import { createPattern,detectByPattern } from "./combinations/create_detect_pattern";
import {MatchClientPattern} from './types/outputTypes';
(async () => {
    const patternDir: string = "../allrepos/reposuuidv8.0.0failure";
    const matchDir: string = "../allrepos/reposuuidv8.0.0success";
    const libName: string = process.argv[2];
    let lastpatterns: string[][][] = [];
    //パターン作成
    lastpatterns = await createPattern(patternDir,libName);
    //検出
    let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns);
    // console.log(matchCliantPatternJson);
})();