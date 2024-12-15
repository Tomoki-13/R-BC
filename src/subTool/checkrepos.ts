import { getSubDir } from "../utils/getSubDir";
//ディレクトリの末尾から2つ目のディレクトリ名までを比較するコード
(async () => {
    const getPatternDir1: string = "path1";
    const getPatternDir2: string = "path2";
    let repos1 = await getSubDir(getPatternDir1);
    repos1 = repos1.map(path => {
        const parts = path.split('/');
        return parts.slice(-2).join('/');
    });
    let repos2 = await getSubDir(getPatternDir2);
    repos2 = repos2.map(path => {
        const parts = path.split('/');
        return parts.slice(-2).join('/');
    });
    const onlyInRepos1 = repos1.filter(repo => !repos2.includes(repo));
    const onlyInRepos2 = repos2.filter(repo => !repos1.includes(repo));
    //出力
    console.log("Only in repos1:", onlyInRepos1);
    console.log("Only in repos2:", onlyInRepos2);
})();