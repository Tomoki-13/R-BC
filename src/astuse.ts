import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
const {astsample} = require("./utils/astsample");

(async () => {
    const startDirectory: string = "../Sample";
    let n: number = 0;
    try {
        const libName: string | undefined = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        
        //各ディレクトリに対する処理
        for (const subdir of alldirs) {
            let extract_pattern: string[]= [];
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern = await astsample(allFiles,libName);
            //成功したクライアントでパターンを持っているものを検出
            if (extract_pattern.length !== 0) {
                console.log(subdir);
                console.log(extract_pattern);
                n++;
            }
        }
        console.log(alldirs.length);
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();