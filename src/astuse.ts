import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import {analyzeAst} from "./utils/analyzeAst";
import {useAst } from "./utils/useAst";

(async () => {
    //const startDirectory: string = "../reposv7.0.0failure";
    const startDirectory: string = "../reposgv7failure";
    let n: number = 0;
    try {
        const libName: string  = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        
        //各ディレクトリに対する処理
        for (const subdir of alldirs) {
            let extract_pattern1: string[][]= [];
            let extract_pattern2: string[][]= [];
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern1 = await useAst(allFiles,libName);
            //成功したクライアントでパターンを持っているものを検出
            // if (extract_pattern1.length !== 0) {
            //     console.log(subdir);
            //     console.log(extract_pattern1);
            //     n++;
            //}
            if (extract_pattern1.length > 0) {
                console.log(subdir);
                console.log(extract_pattern1);
                n++;
            }else{
                // console.log(subdir);
                // console.log('else');
                // n++;
            }
        }
        console.log(alldirs.length);
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();