const fsPromises = require('fs').promises;
const { funcNameIdentifiers, secfuncNameIdentifiers } = require("./funcNameIdentifiers");
const { extractImportLines } = require("./extractImportLines");
const { analyzeFile } = require("./analyzeFile");
const { FisrstAnalyzeArgument } = require("./AnalyzeArgument");

// クライアントの対象ファイルから変数名の使われ方の収集

export const useFunc = async (allFiles: string[], libName: string): Promise<string[][]> =>{
    const pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);

        try {
            const fileContent:string = await fsPromises.readFile(filePath, 'utf8');
            const lines:string[] = extractImportLines(fileContent, libName);

            for (const line of lines) {
                let funcName:string[] = funcNameIdentifiers(line, libName);

                if (funcName.length > 0) {
                    const useFuncLines:string[] = analyzeFile(funcName, fileContent, libName);
                    let secuseFuncLines: string[] = [];

                    if (funcName.length > 1) {
                        for (const oneFuncName of funcName) {
                            const secUseFuncnames = secfuncNameIdentifiers(oneFuncName, fileContent);
                            if (secUseFuncnames) {
                                secuseFuncLines = secuseFuncLines.concat(analyzeFile(secUseFuncnames, fileContent));
                            }
                        }
                    } else {
                        const secUseFuncnames = secfuncNameIdentifiers(funcName, fileContent);
                        if (secUseFuncnames && secUseFuncnames.length > 0) {
                            secuseFuncLines = analyzeFile(secUseFuncnames, fileContent);
                        }
                    }

                    if (useFuncLines && useFuncLines.length > 0) {
                        pattern.push(useFuncLines);
                    }
                    if (secuseFuncLines && secuseFuncLines.length > 0) {
                        const combinedLines:string[] = [...new Set([...pattern[pattern.length - 1], ...secuseFuncLines])];
                        pattern[pattern.length - 1] = combinedLines;
                    }
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }

    return pattern;
}

// 関数名. の使用法を識別
export const useFunc1_v7 = async (allFiles: string[], libName: string): Promise<string[][]> => {
    const pattern:string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);

        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent, libName);
            let funcName: string[] = [];

            for (const line of lines) {
                funcName = funcNameIdentifiers(line, libName);

                if (funcName !== undefined && funcName.length > 0) {
                    if (funcName.length > 1) {
                        funcName = funcName.map(name => name + '.');
                    } else {
                        funcName[0] = funcName[0] + '.';
                    }

                    const useFuncLines = analyzeFile(funcName, fileContent);
                    if (useFuncLines !== '') {
                        pattern.push(useFuncLines);
                    }
                }

                funcName = [];
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }

    return pattern;
}

export async function useFuncg7(allFiles: string[], libName: string): Promise<string[][]> {
    const pattern: string[][] = [];
    const visitedFiles:Set<string> = new Set<string>();

    for (const filePath of allFiles) {
        if (visitedFiles.has(filePath)) continue;
        visitedFiles.add(filePath);

        try {
            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const lines = extractImportLines(fileContent, libName);

            for (const line of lines) {
                let funcName: string[] = funcNameIdentifiers(line, libName);

                if (funcName && funcName.length > 0) {
                    const useFuncLines = analyzeFile(funcName, fileContent, libName);
                    let secuseFuncLines: string[] = [];

                    if (funcName.length > 1) {
                        for (const oneFuncName of funcName) {
                            const secUseFuncnames = secfuncNameIdentifiers(oneFuncName, fileContent);
                            if (secUseFuncnames) {
                                secuseFuncLines = secuseFuncLines.concat(analyzeFile(secUseFuncnames, fileContent));
                            }
                        }
                    } else {
                        const secUseFuncnames = secfuncNameIdentifiers(funcName[0], fileContent);
                        if (secUseFuncnames && secUseFuncnames.length > 0) {
                            secuseFuncLines = analyzeFile(secUseFuncnames, fileContent);
                        }
                    }

                    if (useFuncLines && useFuncLines.length > 0) {
                        pattern.push(useFuncLines);
                    }
                    if (secuseFuncLines && secuseFuncLines.length > 0) {
                        const combinedLines:string[] = [...new Set([...pattern[pattern.length - 1], ...secuseFuncLines])];
                        pattern[pattern.length - 1] = combinedLines;
                    }
                }
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }

    return pattern;
}

