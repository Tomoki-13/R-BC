import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useAst, abstuseAst } from "./utils/useAst";
import fs from 'fs';
import path from 'path';
import { Result } from './types/Result';
import { patternMatch,abstStr ,prep_repl,transformArgumrnt} from "./utils/patternMatch";

(async () => {
    const startDirectory: string = "../allrepos/";
    //const startDirectory: string = "../reposgv7failure";
    const matchStartdir: string = "../allrepos/";
    let failurePattern1: number = 0;
    let lastPattern1: number = 0;
    const libName: string = process.argv[2];
    const alldirs: string[] = await getSubDir(startDirectory);
    const csvRows: string[] = ['failureclient,detectPatterns'];
    const matchcsvRows: string[] = ['client,Patterns,matchedPattern'];
    let respattern: string[][][] = [];

    //各ディレクトリに対する処理
    for(const subdir of alldirs) {
        let extract_pattern1: string[][] = [];
        const allFiles: string[] = await getAllFiles(subdir);
        //extract_pattern1 = await useAst(allFiles, libName);
        extract_pattern1 = await abstuseAst(allFiles, libName);

        if(extract_pattern1.length > 0) {
            // console.log(subdir);
            // console.log(extract_pattern1);
            failurePattern1++;
            respattern.push(extract_pattern1);
            // if(respattern.length == 1){
            //     if(respattern[0].length ==1){
            //         console.log(subdir);
            //         console.log(extract_pattern1);
            //     }
            // }
            //CSV行に追加
            const patternString = JSON.stringify(extract_pattern1).replace(/"/g, '""');
            csvRows.push(`"${subdir}","${patternString}"`);
        }
        // else{
        //     console.log(subdir);
        //     console.log('else');
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
    console.log('failure clientnum' + alldirs.length);
    console.log('patern client' + failurePattern1);
    // console.log(respattern);
    console.log("----------------------");

    //呼び出しだけのもの削除
    respattern = removeCallOnly(respattern);
    //包含関係のあるものは置き換え
    let newpatterns: string[][][] = [];

    //包含関係まとめ
    //パターンの短いからマッチするように工夫
    respattern = sortRespattern(respattern);
    for(const subrespattern of respattern) {
        const tmppattern = JSON.parse(JSON.stringify(respattern));
        const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(subrespattern, respattern);
        if(isMatch && matchedPattern) {
            newpatterns.push(matchedPattern);
        } else {
            newpatterns.push(subrespattern);
        }
    }
    //respattern = newpatterns;
    let outputFileName1 = path.join(outputDirectory, `${path.basename(startDirectory)}_newpatterns_output.json`);
    if(fs.existsSync(outputFileName1)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName1 = path.join(outputDirectory, `${path.basename(startDirectory)}_newpatterns_output_${formattedDate}.json`);
    }
    //pattern
    //fs.writeFileSync(outputFileName1, JSON.stringify(newpatterns, null, 4), 'utf8');
    
    // console.log("respattern3");
    // console.log(respattern);
    
    //重複パターンの削除respattern[i][j]
    respattern = removecase(respattern);
    //console.log('respattern:'+respattern.length);
    let countmatchedpatterns:string[][][] = [];
    //第２処理
    const matchAlldirs: string[] = await getSubDir(matchStartdir);
    for(const subdir of matchAlldirs) {
        let match_extract_pattern: string[][] = [];
        const allFiles: string[] = await getAllFiles(subdir);
        match_extract_pattern = await useAst(allFiles, libName);
        // console.log(match_extract_pattern);
        if(match_extract_pattern.length > 0) {
            // match_extract_pattern確認用　respattern作成したパターン
            const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, respattern)
            if(isMatch && matchedPattern) {
                // console.log("----------------------");
                // console.log(subdir);
                // console.log("match_extract_pattern");
                // console.log(match_extract_pattern);
                // console.log("matchedPattern");
                // console.log(matchedPattern);
                // console.log("----------------------");
                let array = matchedPattern;
                for(let i = 0;array.length>i;i++){
                    //変数の置き換え
                    array[i] = prep_repl(array[i]);
                    //console.log(prep_repl(respattern[i][j]));
                    for(let j = 1;array[i].length>j;j++){
                        //引数の置き換え
                        if (typeof array[i][j] === 'string' &&(array[i][j].includes('require') ||array[i][j].includes('import') ||array[i][j].includes('_interopRequireDefault'))) {
                            continue; // 条件に一致する場合は次のループへ
                        }
                        array[i][j] = transformArgumrnt(array[i][j]);
                    }
                }
                for(let i = array.length - 1; i >= 0; i--) {
                    if(Array.isArray(array[i])) {
                        const uniquePatterns = [...new Set(array[i])];
                        array[i] = uniquePatterns;
                        if(array[i].length === 0) {
                            array[i].splice(i, 1);
                        }
                    }
                }
                matchcsvRows.push(`"${subdir}","${match_extract_pattern}","${array}"`);
                countmatchedpatterns.push(array);
            }
        }
    }
    const search_patterns = JSON.parse(JSON.stringify(countmatchedpatterns));
    let detecteduserpattern = countPatterns(search_patterns);
    detecteduserpattern.sort((a, b) => b.count - a.count);

    //Detectioncount
    const totalCount = detecteduserpattern.reduce((acc, item) => acc + item.count, 0);
    const output = { patterns: detecteduserpattern,totalCount: totalCount};
    let outputFileName4 = path.join(outputDirectory, `${path.basename(matchStartdir)}_Detectioncount_output.json`);
    if(fs.existsSync(outputFileName4)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName4 = path.join(outputDirectory, `${path.basename(matchStartdir)}_Detectioncount_output_${formattedDate}.json`);
    }
    fs.writeFileSync(outputFileName4, JSON.stringify(output, null, 4));


    let outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_matchResults_output.csv`);
    if(fs.existsSync(outputFileName2)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_matchResults_output_${formattedDate}.csv`);
    }
    fs.writeFileSync(outputFileName2, matchcsvRows.join('\n'), 'utf8');
    console.log('success clientnum' + matchAlldirs.length);


    //使用パターンようの変換
    let stringvariable: string[][][] = abstStr(newpatterns);

    let mergepattern: { pattern: string[][], count: number }[] = countPatterns(stringvariable);
    console.log('mergepattern.length:'+mergepattern.length);

    //count の多い順にソート
    mergepattern.sort((a, b) => b.count - a.count);
    //detectpatternlist
    let outputFileName3 = path.join(outputDirectory, `${path.basename(startDirectory)}_detectpatternlist_output.json`);
    if(fs.existsSync(outputFileName3)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName3 = path.join(outputDirectory, `${path.basename(startDirectory)}_detectpatternlist_output_${formattedDate}.json`);
    }
    const totalCount2 = mergepattern.reduce((acc, item) => acc + item.count, 0);
    const output2 = {patterns: mergepattern,totalCount: totalCount2};
    if (mergepattern) {
        fs.writeFileSync(outputFileName3, JSON.stringify(output2, null, 4), 'utf8');
        //const totalCount = mergepattern.reduce((acc, item) => acc + item.count, 0);
        // console.log('totalCount:'+totalCount);
        // const top5 = mergepattern.slice(0, 5);
        // top5.forEach((item, index) => {
        //     console.log(`Rank ${index + 1}: Count = ${item.count}, Pattern = ${JSON.stringify(item.pattern)}`);
        // });
    }
})();

//重複カウント
function countPatterns(pattern: string[][][]): { pattern: string[][], count: number }[] {
    const patternMap = new Map<string, number>();
    pattern.forEach(subrespattern => {
        //subrespattern を文字列に変換
        const patternString = JSON.stringify(subrespattern);
        if(patternMap.has(patternString)) {
            patternMap.set(patternString, patternMap.get(patternString)! + 1);
        } else {
            patternMap.set(patternString, 1);
        }
    });

    // 結果を { pattern, count } の形式に変換
    return Array.from(patternMap.entries()).map(([patternString, count]) => {
        const pattern = JSON.parse(patternString);
        return { pattern, count };
    });
}
function sortRespattern(respattern: string[][][]): string[][][] {
    respattern.sort((a, b) => a.length - b.length);
    return respattern;
}
function removecase(pattern:string[][][]): string[][][] {
    for(let i = pattern.length - 1; i >= 0; i--) {
        if(Array.isArray(pattern[i])) {
            for(let j = pattern[i].length - 1; j >= 0; j--) {
                if(Array.isArray(pattern[i][j])) {
                    const uniqueElements = [...new Set(pattern[i][j])];
                    pattern[i][j] = uniqueElements;
                    if(pattern[i][j].length === 0) {
                        pattern[i].splice(j, 1);
                    }
                }
            }

            // 外部の配列が空なら削除
            if(pattern[i].length === 0) {
                pattern.splice(i, 1);
            }
        }
    }
    //重複パターンの削除pattern[i][j]
    //console.log(pattern.length);
    for(let i = pattern.length - 1; i >= 0; i--) {
        if(Array.isArray(pattern[i])) {
            for(let j = pattern[i].length - 1; j >= 0; j--) {
                if(Array.isArray(pattern[i][j])) {
                    const uniqueElements = [...new Set(pattern[i][j])];
                    pattern[i][j] = uniqueElements;
                    if(pattern[i][j].length === 0) {
                        pattern[i].splice(j, 1);
                    }
                }
            }

            // 外部の配列が空なら削除
            if(pattern[i].length === 0) {
                pattern.splice(i, 1);
            }
        }
    }

    // console.log(pattern.length);
    //console.log("pattern");
    //console.log(pattern);

    // 重複パターンの削除pattern[i]
    const seen = new Map<string, string[][]>();
    for(const subpattern of pattern) {
        const key = JSON.stringify(subpattern);
        // console.log(seen);
        if(!seen.has(key)) {
            seen.set(key, subpattern);
        }
    }
    pattern = Array.from(seen.values());
    return pattern;
}
function removeCallOnly(pattern:string[][][]): string[][][] {
    //呼び出しだけのもの削除
    for(let i = pattern.length - 1; i >= 0; i--) {
        let judge = true;
        //importしか持たないものを除外するための判定
        let judge2 = true;
        for(let j = pattern[i].length - 1; j >= 0; j--) {
            if(pattern[i][j].length > 1) {
                judge = false;
            }
            
            for(let k = pattern[i][j].length - 1; k >= 0; k--){
                if(!(pattern[i][j][k].includes("import") || pattern[i][j][k].includes("require") || pattern[i][j][k].includes("_interopRequireDefault"))){
                    judge2 = false;
                }
                if(judge2 === false){
                    break;
                }
            }
        }
        //該当パターンの削除
        if(judge === true) {
            pattern.splice(i, 1);
        }
        //該当パターンの削除
        if(judge2 === true) {
            pattern.splice(i, 1);
        }
    }
    return pattern;
}