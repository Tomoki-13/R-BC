//変数のファイル内での使用方法を収集
export const AnalyzeFile = (funcNames:string[], code:string, libName:string):string[] => {
    //console.log(funcNames);
    const lines = code.split('\n').map(line => line.trim());
    let useFuncResult:string[] = [];
    if(funcNames.length>1){
        for (const funcName of funcNames) { 
                let useFuncLines:string[] = lines.filter(line => new RegExp('\\b' + funcName.replace(/\./g, '\\.') + '\\b').test(line) && !/^\s*\/\//.test(line) /*&&!/import|require/.test(line)*/);

                if(useFuncLines!=null&&useFuncLines.length !== 0){   
                    useFuncLines = useFuncLines.filter(line => line.length < 100);
                    const str1 = libName + '.mockImplementation';
                    useFuncLines = useFuncLines.filter(line => !line.includes(str1));
                    useFuncResult = useFuncResult.concat(useFuncLines);
                }
        }
        return useFuncResult;
    }else{
        let useFuncLines: string[] = lines.filter(line => new RegExp('\\b' + funcNames[0].replace(/\./g, '\\.') + '\\b').test(line) && !/^\s*\/\//.test(line)/*&&!/import|require/.test(line)*/);
        //console.log("use2:"+useFuncLines);
        if (useFuncLines != null && useFuncLines.length !== 0) {
            const str1 = libName + '.mockImplementation';
            useFuncLines = useFuncLines.filter(line => line.length < 100 && !line.includes(str1) &&!line.includes('webpack_require'));
            if (useFuncLines.length > 0) {
                  useFuncResult = useFuncResult.concat(useFuncLines);
            }
        }
        //console.log(useFuncResult);
        return useFuncResult;
    }
}