//importの特定パターンの収集
export const extractImportLinesFull = (code: string): string[] => {
    const lines = code.split('\n');
    const importAndRequireLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    return importAndRequireLines;
}

export const extractImportLines = (code: string, libName: string): string[] => {
    const lines = code.split('\n');
    let importAndRequireLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //("|')と(?=["'/])前後に不適切なものがつかないようにするため
    const resultimportAndRequireLines:string[] = importAndRequireLines.filter(line => new RegExp(`("|')${libName}(?=["'/])`).test(line));
    return resultimportAndRequireLines;
}
