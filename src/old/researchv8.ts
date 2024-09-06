import { getSubDir } from "../utils/getSubDir";
import { getAllFiles } from "../utils/getAllFiles";
const {add_extract,add_full_extract} = require("./utils/add_extract");
import { useFunc } from "../combinations/useFunc";
import fs from 'fs';
import path from 'path';

(async () => {
    const startDirectory: string = "../reposv8.0.0success";
    //const startDirectory: string = "../reposv8.0.0failure";
    let n: number = 0;
    try {
        const libName: string | undefined = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        const csvRows: string[] = ['client,Patterns']; 
        
        //各ディレクトリに対する処理
        for(const subdir of alldirs) {
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
            if(extract_pattern.length !== 0) {
                console.log(subdir);
                //console.log(extract_pattern);
                console.log(extract_pattern2);
                n++;
                //CSV行に追加
                const patternString = JSON.stringify(extract_pattern2).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }
        }
        const outputDirectory = path.resolve(__dirname, '../output');
        if(!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory);
        }
        let outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_researchv8_output.csv`);
        //ファイルの重複阻止
        if(fs.existsSync(outputFileName)) {
            const date = new Date();
            const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
            outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_researchv8_${formattedDate}.csv`);
        }
        fs.writeFileSync(outputFileName, csvRows.join('\n'), 'utf8');
        console.log(alldirs.length);
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();