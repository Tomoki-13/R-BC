import { promises as fsPromises } from 'fs';
import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
const {add_extract} = require("./utils/add_extract");
import { extractImportLines } from "./utils/extractImportLines";
(async () => {

    //const startDirectory:string = "../repos";
    const startDirectory:string = "../reposv8.0.0failure";
    let n:number=0;
    const libName:string = process.argv[2];
    try {
        const alldirs:string[] = await getSubDir(startDirectory);
        console.log(alldirs.length);
        //各ディレクトリに対する処理
        let extract_pattern:string[][] = new Array();
        for (const subdir of alldirs) {
            const allFiles:string[] = await getAllFiles(subdir);
            extract_pattern = await add_extract(allFiles);
            //console.log(extract_pattern);

            // パターンを持っていない場合クライアントの出力
            if (extract_pattern.length === 0) {
                n++;
                for (const filePath of allFiles) {
                    try {
                        // ファイルの内容の取得
                        const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
                        // 呼び出し列の取得
                        const lines:string[] = extractImportLines(fileContent,libName);
                        if (lines.length !== 0) {
                            console.log(filePath);
                            console.log("Current lines:", lines);
                        }
                    } catch (err) {
                        console.error('Error readFile:', err);
                    }
                }
            }

            // 成功したクライアントでパターンを持っているものを検出
            if (extract_pattern.length !== 0) {
                console.log(subdir);
                console.log(extract_pattern);
                n++;
            }
        };
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();