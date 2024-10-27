import { promises as fsPromises } from 'fs';
import { getSubDir } from "../utils/getSubDir";
import { getAllFiles } from "../utils/getAllFiles";
const {add_extract} = require("../utils/add_extract");
import { extractImportLines } from "../utils/extractImportLines";
(async () => {

    //const startDirectory:string = "../repos";
    const startDirectory:string = "../../allrepos/repos";
    let n:number=0;
    //const libName:string = process.argv[2];
    try {
        const alldirs:string[] = await getSubDir(startDirectory);
        console.log(alldirs.length);
        //各ディレクトリに対する処理
        let extract_pattern:string[][] = new Array();
        for(const subdir of alldirs) {
            const allFiles:string[] = await getAllFiles(subdir);
            extract_pattern = await add_extract(allFiles);
            // if(extract_pattern.length === 0) {
            //     n++;
            //     for(const filePath of allFiles) {
            //         try {
            //             const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            //             const lines:string[] = extractImportLines(fileContent,libName);
            //             if(lines.length !== 0) {
            //                 console.log(filePath);
            //                 console.log("Current lines:", lines);
            //             }
            //         } catch (err) {
            //             console.error('Error readFile:', err);
            //         }
            //     }
            // }

            if(extract_pattern.length !== 0) {
                let i = 0;
                for(const lines of extract_pattern) {
                    for(const line of lines) {
                        if(line.includes("`")) {
                            console.log(line);
                            i++;
                        }
                    } 
                }
                if(i>0){
                    //console.log(subdir+'num:'+i);
                    n++;
                    console.log('--------------------');
                }
            }
        };
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();