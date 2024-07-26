import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useFunc1_v7, useFunc } from "./utils/useFunc";
import { v7Idetifiers, v7removeException, deepImport } from "./utils/v7Idetifiers";
import fs from 'fs';
import path from 'path';
(async () => {
    const libName:string = process.argv[2];
    //console.log('libName'+libName);
    const startDirectory:string = "../reposv7.0.0success";
    const csvRows: string[] = ['client,Patterns']; 
    let n: number=0;
    
    try {
        //ディレクトリごとに求めたいため
        const alldirs:string[] = await getSubDir(startDirectory);
        for (const subdir of alldirs) {
            let extract_pattern1:string[][] = [];
            let extract_pattern2:string[][] = [];
            const allFiles:string[] = await getAllFiles(subdir);
            extract_pattern1 = await useFunc1_v7(allFiles,libName);
            extract_pattern2 = await useFunc(allFiles,libName);
            //一部
            // console.log(extract_pattern1);
            //全部
            // console.log(extract_pattern2);
            let InPatternJudge:boolean = false;
            let ExceptionJudge:boolean = false;
            let DeepImportant:boolean = false;
            if(extract_pattern2.length !== 0){
                InPatternJudge = await v7Idetifiers(extract_pattern2);
                ExceptionJudge = await v7removeException(extract_pattern1,extract_pattern2);
                DeepImportant = await deepImport(extract_pattern2);
            }
            //パターンもちを検出
            if((extract_pattern1.length !== 0  && ExceptionJudge == false)){
                console.log('1'+subdir);
                console.log(extract_pattern2);
                //console.log(extract_pattern1);
                n++;
                //CSV行に追加
                const patternString = JSON.stringify(extract_pattern2).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }else if (InPatternJudge==true){
                console.log('2'+subdir);
                console.log(extract_pattern2);
                n++;
                const patternString = JSON.stringify(extract_pattern2).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }else if (DeepImportant==true){
                console.log('3'+subdir);
                console.log(extract_pattern2);
                n++;
                const patternString = JSON.stringify(extract_pattern2).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }else{
                // console.log(subdir);
                // console.log(InPatternJudge);
                // console.log(ExceptionJudge);
                // console.log(DeepImportant);
                //console.log(extract_pattern1);
                //console.log(extract_pattern2);
                //n++;
            }
        };
        //ディレクトリ作成
        const outputDirectory = path.resolve(__dirname, '../output');
        if(!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory);
        }
        let outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_preoutput.csv`);
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