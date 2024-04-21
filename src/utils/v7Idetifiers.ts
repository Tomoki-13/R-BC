import { secfuncNameIdentifiers }  from "./funcNameIdentifiers";
//uuid()の使用を検知
export const v7Idetifiers = async (extract_pattern2: string[][]): Promise<boolean>  => {
    let resultJudge:boolean= false;
    if(extract_pattern2.length>0){
        for (const arrays of extract_pattern2) {
            //配列でなければ呼び出しのみで未使用と判断できる
            if(Array.isArray(arrays)){
                let judge1:boolean= false;
                let funcName:string = '';
                let secFunName:string[] =[];
                let word:string = '';
                let interopRequireDefaultWord:string = '';
                for (const str of arrays) {
                    const pattern1:RegExp = /import\s+(\w+)\s+from\s+\(*['"]uuid['"]\)*/;
                    const pattern2:RegExp = /(?:var|const|let)*\s*(\w+)\s*=\s*require\(*['"]uuid['"]\)*/;
                    const pattern3:RegExp = /import\s\*\s+as\s+(\w+)\s+from\s+\(*['"]uuid['"]\)*/;
                    //const pattern4: RegExp = /(?:var|const|let)*\s*(\w+)\s*=\s*require\(*['"]uuid['"]\)./;
                    
                    const match1:string[]|null = str.match(pattern1);
                    const match2:string[]|null = str.match(pattern2);
                    const match3:string[]|null = str.match(pattern3);
                    //const match4: string[]|null = str.match(pattern4);
                    // if(match4){
                    //     break;
                    // }
                    if(match1){
                        judge1= true;
                        funcName = match1[1].trim();
                    }else if(match2&&!str.includes(').')){
                        judge1= true;
                        funcName = match2[1].trim();
                    }else if(match3){
                        judge1= true;
                        funcName = match3[1].trim();
                    }
                    if(word!==''&&judge1=== false){
                        let useFuncLines: string[] = str.split('\n').filter((line: string) => line.includes(word) && !/^\s*\/\//.test(line)/*&&!/import|require/.test(line)*/);
                        let useSecFuncLines: string[] = [];
                        if(interopRequireDefaultWord!=''){
                            useSecFuncLines= str.split('\n').filter((line: string) => line.includes(interopRequireDefaultWord) && !/^\s*\/\//.test(line)/*&&!/import|require/.test(line)*/);
                        }
                        if(useFuncLines.length > 0||useSecFuncLines.length > 0){
                            //console.log("useSecFuncLines:"+useSecFuncLines);
                            resultJudge=true;
                        }
                    }
                    if(judge1=== true&&funcName!==''){
                        word = funcName + '()';
                        funcName = '';
                        secFunName = secfuncNameIdentifiers(funcName,str);
                        interopRequireDefaultWord = secFunName[0] + '.default.';
                        judge1= false;
                    }
                    //console.log(resultJudge);
                    
                }
            }
        }
    }
    return(resultJudge);
}

export const v7removeException = async (extract_pattern1: string[][], extract_pattern2: string[][]): Promise<boolean> => {
    let resultJudge: boolean = true;
    // 関数名.を含む行を持つ要素だけをextract_pattern2から収集（extract_pattern1には関数名.の呼び出しのみしかない）
    // extract_pattern1と同じ要素を持つ配列ごとに宣言を確認する必要がある，ファイルの違いを考慮するため
    const matchedElements: string[][] = [];
    for (const item1 of extract_pattern1) {
        const searchString: string = item1[0]; // extract_pattern1の要素を検索する文字列
        for (const item2 of extract_pattern2) {
            if (item2.flat().includes(searchString)) {
                matchedElements.push(item2);
            }
        }
    }
    // console.log(matchedElements);
    if (Array.isArray(matchedElements)) {
        for (const Element of matchedElements) {
            let judge1 = false;
            if (Array.isArray(Element)) {
                for (const str of Element) {
                    const pattern1 = /(?:var|const|let)*\s*(\w+)\s*=\s*require\(*['"]uuid['"]\)*/;
                    const pattern2 = /import \*\s+as\s+(\w+)\s+from\s+\(*['"]uuid['"]\)*/;
                    const match1 = str.match(pattern1);
                    const match2 = str.match(pattern2);
                    // console.log(match1);
                    // console.log(match2);
                    if (match1 || match2) {
                        judge1 = true;
                    }
                }
            }
            if (judge1 == false) {
                resultJudge = false;
            }
        }
    }
    return resultJudge;
}

export async function deepImport(extract_pattern2:string[][]): Promise<boolean> {
    let resultJudge: boolean = false;
    if(Array.isArray(extract_pattern2)){
        for (const arrays of extract_pattern2) {
            if(Array.isArray(arrays)){
                for (const str of arrays) {
                    const pattern1: RegExp = /\(*['"]uuid\/.*?\/.*?['"]\)*/;
                    const match1: string[]|null = str.match(pattern1);
                    if(match1){
                        resultJudge = true;
                    }
                }
            }
        }
    }
    return(resultJudge);
}

