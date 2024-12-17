//codeに１行の内容，argNumに取得したい引数番号を入れる　引数の変数または内容を返す
export const getArgument = (code: string, funcName: string, argNum: number): string | null => {
    const regex:RegExp = new RegExp(`${funcName}(\\.[a-zA-Z]+)?\\((.*?)\\)`);
    const match:string[]|null = code.match(regex);
    let ArgumentArray: string[] | undefined;
    if(match) {
        const AnalyzeArray = match[2].split(',').map(item => item.trim());
        // 最初の文字が '[' で、かつ最後の文字が ']' である要素までを繋げる
        let connectedArgs: string[] = [];
        let insideArray = false;
        let connectedString = '';

        for(const item of AnalyzeArray) {
            if(!insideArray) {
                if(item.startsWith('[')) {
                    insideArray = true;
                    connectedString = item;
                } else {
                    connectedArgs.push(item.trim());
                }
            } else {
                connectedString += ',' + item.trim();
                if(item.endsWith(']')) {
                    connectedArgs.push(connectedString.replace(/^\[|\]$/g, ''));
                    insideArray = false;
                }
            }
        }

        ArgumentArray = connectedArgs;
        // ArgumentArray[0]第１引数,ArgumentArray[1]第２引数,ArgumentArray[2]第３引数
        console.log(ArgumentArray);
        if(ArgumentArray[argNum]) {
            return ArgumentArray[argNum];
        } else {
            return null;
        }
    }
    return null;
}