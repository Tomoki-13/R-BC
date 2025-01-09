import { getSubDir } from '../utils/getSubDir';
import { getAllFiles } from '../utils/getAllFiles';
import { add_funcName } from './internal/add_funcName';
//機能の行を見るため
(async () => {
    const libName:string = process.argv[2];

    //const startDirectory:string = "../repos";
    const startDirectory:string = "../../allrepos/";
    let n=0;
    try {
        //ディレクトリごとに求めたいため
        const alldirs:string[] = await getSubDir(startDirectory);
        //console.log(alldirs.length);
        //console.log(alldirs);
        //各ディレクトリに対する処理
        let extract_pattern:string[][] = new Array();
        for(const subdir of alldirs) {
            console.log(subdir);
            //デバック用
            const allFiles: string[] = await getAllFiles(subdir);
            extract_pattern = await add_funcName(allFiles,libName,0);

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
