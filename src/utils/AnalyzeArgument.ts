import {getArgument} from "./getArgument";
//patternにコードの配列
export const FisrstAnalyzeArgument = (funcName:string, patterns:string[]):string[] => {
    let ArgumentResult:string[] = [];
    for(const pattern of patterns){
        let result = getArgument(pattern,funcName,1);
        if(result != null){
            ArgumentResult = ArgumentResult.concat(result);
        }
    }
    console.log(ArgumentResult);
    return ArgumentResult;
}
