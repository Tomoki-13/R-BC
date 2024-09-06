const fsPromises = require('fs').promises;
const { getSubDir }  = require("./utils/getSubDir");
const { getAllFiles }  = require("./utils/getAllFiles");
const { funcNameIdentifiers }  = require("./utils/funcNameIdentifiers");
const {extractImportLines} = require("./utils/extractImportLines");

const add_funcName = async (allFiles: string[],libName:string): Promise<string[][]> => {
    let pattern: string[][] = [];
    for(const filePath of allFiles) {
        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent,libName);
            if(lines.length>0){
                console.log('extractImportLines');
                console.log(lines);
            }
            for(const line of lines) {
                let funcNames = funcNameIdentifiers(line, libName);
                if(funcNames.length > 0) {
                    pattern.push(funcNames);
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}

(async () => {
    const libName:string = process.argv[2];

    //const startDirectory:string = "../repos";
    const startDirectory:string = "../reposv7.0.0failure";
    let n=0;
    try {
        //ディレクトリごとに求めたいため
        const alldirs:string[] = await getSubDir(startDirectory);
        //console.log(alldirs.length);
        //console.log(alldirs);
        //各ディレクトリに対する処理
        let extract_pattern = new Array();
        for(const subdir of alldirs) {
            console.log(subdir);
            //デバック用
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern = await add_funcName(allFiles,libName);

            //パターンを持っていない場合クライアントの出力
            /* if(extract_pattern.length == 0){
                console.log(subdir);
                console.log(allFiles);
            } */
            //成功したクライアントでパターンを持っているものを検出
            if(extract_pattern.length != 0){
                //console.log(subdir);
                console.log(extract_pattern);
                n++;
            }
        };
        //console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();
