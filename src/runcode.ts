import { createPattern,detectByPattern } from "./combinations/create_detect_pattern";
import {MatchClientPattern} from './types/outputTypes';
(async () => {
    const getPatternDir: string = "../allrepos/reposuuidv7.0.0-beta.0failure";
    const matchDir: string = "../allrepos/reposuuidv7.0.0-beta.0success";
    const libName: string = process.argv[2];
    let lastpatterns: string[][][] = [];
    //パターン作成
    lastpatterns = await createPattern(getPatternDir,libName);
    //検出
    let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns);
    // let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns,1);
})();