import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useAst } from "./utils/useAst";
import fs from 'fs';
import path from 'path';

(async () => {
    const startDirectory: string = "../reposv8.0.0failure";
    //const startDirectory: string = "../reposgv7failure";
    let n: number = 0;
    try {
        const libName: string  = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        const csvRows: string[] = ['client,Patterns']; // CSV header

        //各ディレクトリに対する処理
        for (const subdir of alldirs) {
            let extract_pattern1: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern1 = await useAst(allFiles, libName);

            if(extract_pattern1.length > 0) {
                console.log(subdir);
                console.log(extract_pattern1);
                n++;
                //CSV行に追加
                const patternString = JSON.stringify(extract_pattern1).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }
            // else{
            //     console.log(subdir);
            //     console.log('else');
            //     n++;
            // }

            if(extract_pattern1.length == 1) {
                if(extract_pattern1[0].length == 2 || (extract_pattern1[0].some(element => element.includes("interopRequireDefault")) && extract_pattern1[0].length == 3)) {
                    console.log(subdir);
                    console.log(extract_pattern1);
                }
            }
        }
        //CSVファイルの書き出し　
        //ディレクトリ作成
        const outputDirectory = path.resolve(__dirname, '../output');
        if(!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory);
        }
        let outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_output.csv`);
        //ファイルの重複阻止
        if(fs.existsSync(outputFileName)) {
            const date = new Date();
            const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
            outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_output_${formattedDate}.csv`);
        }
        fs.writeFileSync(outputFileName, csvRows.join('\n'), 'utf8');

        console.log(alldirs.length);
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();