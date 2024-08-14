import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useAst, abstuseAst } from "./combinations/useAst";
import {countPatterns} from './patternOperations/patternCount'
import patternUtils from './patternOperations/patternUtils'
import patternIntegration from "./patternOperations/patternIntegration";

import fs from 'fs';
import path from 'path';
import { patternMatch,abstStr ,prep_repl,transformArgumrnt} from "./patternOperations/patternMatch";

(async () => {
    const startDirectory: string = "../allrepos/reposuuidv7.0.0failure";
    const matchStartdir: string = "../allrepos/reposuuidv7.0.0success";
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
            //CSV行に追加
            const patternString = JSON.stringify(extract_pattern1).replace(/"/g, '""');
            csvRows.push(`"${subdir}","${patternString}"`);
        }
        // else{
        //     console.log(subdir);
        //     console.log('else');
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
    fs.writeFileSync(outputFileName, csvRows.join('\n'), 'utf8');
    // console.log(alldirs.length);
    console.log('failure clientnum' + alldirs.length);
    console.log('patern client' + failurePattern1);
    // console.log(respattern);
    console.log("----------------------");


    //呼び出しだけのもの削除
    respattern = patternUtils.removeCallOnly(respattern);
    console.log('respattern.length'+respattern.length);
    let newpatterns: string[][][] = [];
    //パターンの短いものからマッチするように工夫
    respattern = patternUtils.sortRespattern(respattern);
    //簡易変換
    newpatterns = await patternIntegration.processPatterns(respattern);
    //subnewpatternsは，newpatternsを一意にしたもの
    let subnewpatterns:string[][][] = JSON.parse(JSON.stringify(newpatterns));
    subnewpatterns = patternUtils.removeDuplicate(subnewpatterns);
    let lastpatterns: string[][][] = [];
    lastpatterns = await patternIntegration.processIntegration(newpatterns,subnewpatterns);
    
    // `lastpatterns` の更新後に短いパターンで置き換える処理
    let nextPatterns: string[][][] = JSON.parse(JSON.stringify(lastpatterns));
    lastpatterns = nextPatterns;
    let outputFileName1 = path.join (outputDirectory, `${path.basename(startDirectory)}_newpatterns_output.json`);
    if(fs.existsSync(outputFileName1)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName1 = path.join(outputDirectory, `${path.basename(startDirectory)}_newpatterns_output_${formattedDate}.json`);
    }
    //pattern
    //fs.writeFileSync(outputFileName1, JSON.stringify(newpatterns, null, 4), 'utf8');
    
    //console.log('respattern.length'+respattern.length);
    //重複パターンの削除respattern[i][j]
    respattern = patternUtils.removecase(respattern);
    //console.log('respattern:'+respattern.length);
    let countmatchedpatterns:string[][][] = [];

    //第２処理
    const matchAlldirs: string[] = await getSubDir(matchStartdir);
    console.log('lastpatterns.length'+lastpatterns.length);
    for(const subdir of matchAlldirs) {
        let match_extract_pattern: string[][] = [];
        const allFiles: string[] = await getAllFiles(subdir);
        match_extract_pattern = await useAst(allFiles, libName);
        // console.log(match_extract_pattern);
        if(match_extract_pattern.length > 0) {
            // match_extract_pattern確認用　respattern作成したパターン
            const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, lastpatterns);
            if(isMatch && matchedPattern) {
                // console.log("----------------------");
                // console.log(subdir);
                // console.log("match_extract_pattern");
                // console.log(match_extract_pattern);
                // console.log("matchedPattern");
                // console.log(matchedPattern);
                // console.log("----------------------");
                matchcsvRows.push(`"${subdir}","${match_extract_pattern}","${matchedPattern}"`);
                countmatchedpatterns.push(matchedPattern);
            }
        }
    }
    //countmatchedpatterns検出時に該当したものの配列
    const search_patterns = JSON.parse(JSON.stringify(countmatchedpatterns));
    let detecteduserpattern = countPatterns(search_patterns);
    detecteduserpattern.sort((a, b) => b.count - a.count);

    //検出に使ったパターンの重複結果
    const totalCount = detecteduserpattern.reduce((acc, item) => acc + item.count, 0);
    //console.log('useddetectedn.length:'+detecteduserpattern.length);
    const output = { patterns: detecteduserpattern,totalCount: totalCount};
    //console.log('totalCount'+totalCount);
    let outputFileName4 = path.join(outputDirectory, `${path.basename(matchStartdir)}_Detectioncount_output.json`);
    if(fs.existsSync(outputFileName4)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName4 = path.join(outputDirectory, `${path.basename(matchStartdir)}_Detectioncount_output_${formattedDate}.json`);
    }
    //fs.writeFileSync(outputFileName4, JSON.stringify(output, null, 4));


    let outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_matchResults_output.csv`);
    if(fs.existsSync(outputFileName2)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName2 = path.join(outputDirectory, `${path.basename(matchStartdir)}_matchResults_output_${formattedDate}.csv`);
    }
    //fs.writeFileSync(outputFileName2, matchcsvRows.join('\n'), 'utf8');

    console.log('success clientnum' + matchAlldirs.length);
    let stringvariable: string[][][] = abstStr(lastpatterns);
    console.log(stringvariable.length);
    let mergepattern: { pattern: string[][], count: number }[] = countPatterns(stringvariable);
    //mergepattern = mergeContainedPatterns(mergepattern);
    //count の多い順にソート
    mergepattern.sort((a, b) => b.count - a.count);
    console.log('all detect mergepattern.length:'+mergepattern.length);
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
        //fs.writeFileSync(outputFileName3, JSON.stringify(output2, null, 4), 'utf8');
    }
})();