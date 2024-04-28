import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
const {analyzeAst} = require("./utils/analyzeAst");
const {analyzetsAst} = require("./utils/analyzetsAst");

(async () => {
    const startDirectory: string = "../Sample";
    let n: number = 0;
    try {
        const libName: string | undefined = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        
        //各ディレクトリに対する処理
        for (const subdir of alldirs) {
            let extract_pattern1: string[]= [];
            let extract_pattern2: string[]= [];
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern1 = await analyzeAst(allFiles,libName);
            extract_pattern2 = await analyzetsAst(allFiles,libName);
            //成功したクライアントでパターンを持っているものを検出
            if (extract_pattern1.length !== 0) {
                console.log(subdir);
                console.log(extract_pattern1);
                n++;
            }
            if (extract_pattern2.length !== 0) {
                console.log(subdir);
                console.log(extract_pattern2);
                n++;
            }
        }
        console.log(alldirs.length);
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();