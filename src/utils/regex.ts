export const regex = (pattern:string[][]):RegExp[][]=>{
    let returnpattern:RegExp[][] = [];
    for(let i = 0;i < pattern.length;i++){
        returnpattern.push(convertToRegexArray(pattern[i]));
    }
    return returnpattern;
}
//配列用
function convertToRegexArray(inputs: string[]): RegExp[] {
    let regexArray:RegExp[] = [];
    for(const input of inputs){
        const regex = new RegExp(input);
        console.log(regex);
        if(regex){ 
            console.log(regex);
            regexArray.push(regex);
        }
    }
    return regexArray;
}