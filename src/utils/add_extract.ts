import { promises as fsPromises } from 'fs';
import { extractImportLines_uuid8, extractImportLines } from './extractImportLines';

// ファイルごとの調査と結果の出力
export const add_extract = async(allFiles: string[]): Promise<string[][]> => {
    let pattern: string[][] = [];
    for (const filePath of allFiles) {
        try {
            // ファイルの内容の取得
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            // 呼び出し列の取得
            const line: string[] = extractImportLines_uuid8(fileContent);
            if (line.length !== 0) {
                pattern.push(line);
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}

export const add_full_extract = async(allFiles: string[]): Promise<string[][]> => {
    let pattern: string[][] = [];
    for (const filePath of allFiles) {
        try {
            // ファイルの内容の取得
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            // 呼び出し列の取得
            const libName: string = 'uuid';
            const line: string[] = extractImportLines(fileContent, libName);
            if (line.length !== 0) {
                pattern.push(line);
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}