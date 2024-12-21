import { createPattern } from "./combinations/createPattern";
import { detectByPattern } from "./combinations/detectByPattern";
import {MatchClientPattern} from './types/outputTypes';
(async () => {
    const getPatternDir: string = "../allrepos/repos";
    const matchDir: string = "../allrepos/repos";
    const libName: string = process.argv[2];
    let lastpatterns: string[][][] = [];
    //パターン作成
    lastpatterns = await createPattern(getPatternDir,libName);
    //検出
    let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns);
    // let matchCliantPatternJson:MatchClientPattern[] = await detectByPattern(matchDir,libName,lastpatterns,1);
})();