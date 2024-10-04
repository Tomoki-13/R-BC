import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useAst, abstuseAst } from "./combinations/useAst";
import {countPatterns} from './patternOperations/patternCount';
import {processPatterns} from './combinations/pattern';
import { jsonconf, jsonconfStr } from "./utils/jsonconf";
import fs from 'fs';
import path from 'path';
import {patternMatch} from "./patternOperations/patternMatch";
import patternConversion from "./patternOperations/patternConversion";
import { checkAst } from "./astRelated/checkAst";

(async () => {
    const startDirectory: string = "../allrepos/repo";
    const matchStartdir: string = "../allrepos/repos";
    let failurePattern1: number = 0;
    const libName: string = process.argv[2];
    const alldirs: string[] = await getSubDir(startDirectory);
    const csvRows: string[] = ['failureclient,detectPatterns'];
    const matchcsvRows: string[] = ['client,Patterns,matchedPattern'];
    let sumDetectClient:number = 0;
    let respattern: string[][][] = [];
    
    //各ディレクトリに対する処理
    for(const subdir of alldirs) {
        let extract_pattern1: string[][] = [];
        let judge:boolean = true;
        const allFiles: string[] = await getAllFiles(subdir);
        for(const file of allFiles){
            if(await checkAst(file) === false){
                judge = false;
                break;
            }
        }
        if(judge === false){
            continue;
        }
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
    }

    //CSVファイルの書き出し　
    const outputDirectory = path.resolve(__dirname, '../output');
    if(!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    let outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_output.csv`);
    if(fs.existsSync(outputFileName)) {
        const date = new Date();
        const formattedDate = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        outputFileName = path.join(outputDirectory, `${path.basename(startDirectory)}_output_${formattedDate}.csv`);
    }
    //fs.writeFileSync(outputFileName, csvRows.join('\n'), 'utf8');
    // console.log('failure clientnum' + alldirs.length);
    // console.log('patern client' + failurePattern1);
    console.log("----------------------");

    console.log('respattern:'+respattern.length);
    let countmatchedpatterns:string[][][] = [];
    let lastpatterns = await processPatterns(respattern);

    //第２処理
    let stringvariable: string[][][] = patternConversion.abstStr(lastpatterns);
    //console.log('stringvariable.length'+stringvariable.length);
    const matchAlldirs: string[] = await getSubDir(matchStartdir);
    //console.log('lastpatterns.length'+lastpatterns.length);
    let notest:number = 0;
    let standard:number = 0;
    let noscript:number = 0;
    let noPackagejson:number = 0 ;
    let noClientTestNum:number = 0;
    for(const subdir of matchAlldirs) {
        let test:string = jsonconfStr(subdir);
        if(test !== 'client' && test !== 'standard'){
            if (test === 'no test') {
                notest++;
            } else if(test === 'no scripts'){
                noscript++
            } else if(test === 'noPackage.json'){
                noPackagejson++
            }
            noClientTestNum++;
        }else{
            if (test === 'standard') {
                standard++
            }
            let match_extract_pattern: string[][] = [];
            const allFiles: string[] = await getAllFiles(subdir);
            match_extract_pattern = await useAst(allFiles, libName);
            // console.log(match_extract_pattern);
            if(match_extract_pattern.length > 0) {
                const [isMatch, matchedPattern]: [boolean, string[][] | null] = await patternMatch(match_extract_pattern, stringvariable);
                if(isMatch && matchedPattern) {
                    // console.log("----------------------");
                    //console.log(subdir);
                    // console.log("match_extract_pattern");
                    // console.log(match_extract_pattern);
                    // console.log("matchedPattern");
                    // console.log(matchedPattern);
                    // console.log("----------------------");
                    //console.log(subdir);
                    matchcsvRows.push(`"${subdir}","${match_extract_pattern}","${matchedPattern}"`);
                    countmatchedpatterns.push(matchedPattern);
                    sumDetectClient++;
                }
            }
        }
    }
    //console.log('standard or eslint:'+standard+' notest:'+notest+' noscript:'+noscript+' nopackage.json:'+noPackagejson);
    console.log('sumDetectClient'+sumDetectClient);
    //console.log(matchcsvRows);
    //console.log(noClientTestNum+'/'+matchAlldirs.length);
    console.log('matchcsvRows.length'+matchcsvRows.length);
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
    let mergepattern: { pattern: string[][], count: number }[] = countPatterns(stringvariable);
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