import {funcNameIdentifiers} from '../utils/funcNameIdentifiers';
import {extractImportLines} from '../utils/extractImportLines';
import fsPromises from 'fs/promises';
describe('analyzeAst.ts test', () => {
    test('one name', async () => {
        const filePath:string = "./src/__tests__/InputFile/sample3.ts";
        const libName:string = 'fs/promises';
        const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        let result:string[] = [];
        for (const line of lines) {
            let name:string[] = funcNameIdentifiers(line, libName);
            if (name.length > 0) {
                result = result.concat(name);
            }
        }
        const expectedOutput:string[] = ['fsPromises'];
        expect(result).toEqual(expectedOutput);
    });

    test('More than two', async () => {
        const filePath:string = "./src/__tests__/InputFile/sample.ts";
        const libName:string = './FuncA';
        const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        let result:string[] = [];
        for (const line of lines) {
            let name:string[] = funcNameIdentifiers(line, libName);
            if (name.length > 0) {
                result = result.concat(name);
            }
        }
        const expectedOutput: string[] = ['FuncA', 'FuncB'];
        expect(result).toEqual(expectedOutput);
    });
})
