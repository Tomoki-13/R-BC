import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
const {add_extract,add_full_extract} = require("./utils/add_extract");
import { useFunc } from "./utils/useFunc";

(async () => {
    const startDirectory: string = "../reposv8.0.0success";
    //const startDirectory: string = "../reposv8.0.0failure";
    let n: number = 0;
    try {
        const libName: string | undefined = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        //各ディレクトリに対する処理

        for (const subdir of alldirs) {
            let extract_pattern: string[][] = [];
            let extract_pattern2: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern = await add_extract(allFiles);
            extract_pattern2 = await useFunc(allFiles, libName);

            //パターンを持っていない場合クライアントの出力
            // if(extract_pattern.length == 0){
            //     console.log(subdir);
            //     console.log(extract_pattern2);
            //     n++;
            // }
            //成功したクライアントでパターンを持っているものを検出
            if (extract_pattern.length !== 0) {
                console.log(subdir);
                console.log(extract_pattern);
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