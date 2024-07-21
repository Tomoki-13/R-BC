//importの特定パターンの収集
export const extractImportLines_uuid8 = (code: string): string[] => {
    const lines = code.split('\n');
    const importAndRequireLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    const uuid_importAndRequireLines:string[] = importAndRequireLines.filter(importAndRequireLines => /uuid\/\w+/.test(importAndRequireLines))
    return uuid_importAndRequireLines;
}

export const extractImportLines_uuid7 = (code: string, libName: string): string[] => {
    const lines = code.split('\n');
    const importAndRequireLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //バージョン７．０．０用
    const uuid_importAndRequireLines:string[] = importAndRequireLines.filter(line => new RegExp(`("|')${libName}`).test(line));
    return uuid_importAndRequireLines;
}

export const extractImportLines = (code: string, libName: string): string[] => {
    const lines = code.split('\n');
    let importAndRequireLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //("|')と(?=["'/])前後に不適切なものがつかないようにするため
    const resultimportAndRequireLines:string[] = importAndRequireLines.filter(line => new RegExp(`("|')${libName}(?=["'/])`).test(line));
    return resultimportAndRequireLines;
}
