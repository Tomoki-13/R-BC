import { promises as fsPromises } from 'fs';
import { extractImportLinesFull } from '../utils/extractImportLines';
//ファイルごとの調査と結果の出力
export const add_extract = async(allFiles: string[]): Promise<string[][]> => {
    let pattern: string[][] = [];
    for(const filePath of allFiles) {
        try {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const line: string[] = extractImportLinesFull(fileContent);
            if(line.length !== 0) {
                pattern.push(line);
            }
        } catch (err) {
            console.error('Error readFile:', err);
        }
    }
    return pattern;
}