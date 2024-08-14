import { getSubDir } from "./utils/getSubDir";
import { getAllFiles } from "./utils/getAllFiles";
import { useFunc,useFuncg7} from "./combinations/useFunc";
(async () => {
    const libName:string = process.argv[2];
    const startDirectory:string = "../reposgv7failure";
    console.log('libName:'+libName);
    let n: number = 0;
    try {
        //ディレクトリごとに求めたいため
        const alldirs:string[] = await getSubDir(startDirectory);
        console.log(alldirs.length);
        for (const subdir of alldirs) {
            console.log(subdir);
            let extract_pattern1:string[][] = [];
            let extract_pattern2:string[][] = [];
            const allFiles:string[] = await getAllFiles(subdir);
            //extract_pattern1 = await useFunc(allFiles,libName);
            extract_pattern2 = await useFuncg7(allFiles,libName);
            //console.log(extract_pattern2);
            if(extract_pattern2.length != 0){
                // console.log(subdir);
                console.log(extract_pattern2);
                n++;
            }else{
                console.log(extract_pattern2);
            }
        };
        console.log(n);
    } catch (err) {
        console.error("Error:", err);
    }
})();
