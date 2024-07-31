import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useAst,abstuseAst } from "./utils/useAst";
import fs from 'fs';
import path from 'path';
import { Result } from './types/Result';
import { patternMatch } from "./utils/patternMatch";

(async () => {
    const startDirectory: string = "../allrepos/reposv7.0.0failure";
    //const startDirectory: string = "../reposgv7failure";
    const matchStartdir:string="../allrepos/reposv7.0.0success";
    let n: number = 0;
    try {
        const libName: string  = process.argv[2];
        const alldirs: string[] = await getSubDir(startDirectory);
        const csvRows: string[] = ['failureclient,detectPatterns']; 
        const matchcsvRows: string[] = ['client,Patterns,matchedPattern']; 
        let respattern:string[][][] = []; 
        //各ディレクトリに対する処理
        for (const subdir of alldirs) {
            let extract_pattern1: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            //extract_pattern1 = await useAst(allFiles, libName);
            extract_pattern1 = await abstuseAst(allFiles, libName);


            if(extract_pattern1.length > 0) {
                console.log(subdir);
                console.log(extract_pattern1);
                n++;
                respattern.push(extract_pattern1); 
                //CSV行に追加
                const patternString = JSON.stringify(extract_pattern1).replace(/"/g, '""');
                csvRows.push(`"${subdir}","${patternString}"`);
            }
            // else{
            //     console.log(subdir);
            //     console.log('else');
            //     n++;
            // }

            // if(extract_pattern1.length == 1) {
            //     if(extract_pattern1[0].length == 2 || (extract_pattern1[0].some(element => element.includes("interopRequireDefault")) && extract_pattern1[0].length == 3)) {
            //         console.log(subdir);
            //         console.log(extract_pattern1);
            //     }
            // }else{
                
            // }
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
        //fs.writeFileSync(outputFileName, csvRows.join('\n'), 'utf8');
        // console.log(alldirs.length);
        // console.log(n);
        // console.log(respattern);
        console.log("----------------------");
        //呼び出しだけのもの削除
        for (let i = respattern.length - 1; i >= 0; i--) {
            if (respattern[i].length === 1) {
                for (let j = respattern[i].length - 1; j >= 0; j--) {
                    if (respattern[i][j].length === 1) {
                        //console.log("1respattern[i]:"+respattern[i]);
                        respattern[i].splice(j, 1);
                    }
                }
            }
            //空になった場合、respatternから削除
            if (respattern[i].length === 0) {
                respattern.splice(i, 1);
            }
        }
        // 第２処理
        const matchAlldirs: string[] = await getSubDir(matchStartdir);
        for (const subdir of matchAlldirs) {
            let match_extract_pattern: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            match_extract_pattern = await useAst(allFiles, libName);
            if(match_extract_pattern.length > 0) {
                //match_extract_pattern確認用　respattern作成したパターン
                const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, respattern)
                if(isMatch){
                console.log("----------------------");
                console.log(subdir);
                console.log("match_extract_pattern");
                console.log(match_extract_pattern);
                console.log("matchedPattern");
                console.log(matchedPattern);
                console.log("----------------------");
                matchcsvRows.push(`"${subdir}","${match_extract_pattern}","${matchedPattern}"`);
                }
            }
        }
        let outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_postoutput.csv`);
        //ファイルの重複阻止
        if(fs.existsSync(outputFileName2)) {
            const date = new Date();
            const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
            outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_output_${formattedDate}.csv`);
        }
        //fs.writeFileSync(outputFileName2, matchcsvRows.join('\n'), 'utf8');
    } catch (err) {
        console.error("Error:", err);
    }
})();
