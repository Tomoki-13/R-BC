import {funcNameIdentifiers} from '../utils/funcNameIdentifiers';
import {extractImportLines} from '../utils/extractImportLines';
import fsPromises from 'fs/promises';
describe('funcNameIdentifiers.ts test', () => {
    const filePath1:string = "./src/__tests__/InputFile/functionSample/funcsample.ts";
    const filePath2:string = "./src/__tests__/InputFile/functionSample/funcsample3.ts";
    const filePath3:string = "./src/__tests__/InputFile/import_require_Sample/importsample.ts";
    const filePath4:string = "./src/__tests__/InputFile/import_require_Sample/requiresample.js";

    test('one name', async () => {
        const libName:string = 'fs/promises';
        const fileContent: string = await fsPromises.readFile(filePath2, 'utf8');
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
        const libName:string = './FuncA';
        const fileContent: string = await fsPromises.readFile(filePath1, 'utf8');
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
    test('import', async () => {
        const libName:string = 'module';
        const fileContent: string = await fsPromises.readFile(filePath3, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        let result:string[] = [];
        for (const line of lines) {
            let name:string[] = funcNameIdentifiers(line, libName);
            if (name.length > 0) {
                result = result.concat(name);
            }
        }
        const expectedOutput: string[] = ['abc', 'v4', "v1","v5","bcd","cdf"];
        expect(result).toEqual(expectedOutput);
    });
    test('require', async () => {
        const libName:string = 'module';
        const fileContent: string = await fsPromises.readFile(filePath4, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        let result:string[] = [];
        for (const line of lines) {
            let name:string[] = funcNameIdentifiers(line, libName);
            if (name.length > 0) {
                result = result.concat(name);
            }
        }
        const expectedOutput: string[] = ['abc', 'bcd', "v4","cdf","def","efj"];
        expect(result).toEqual(expectedOutput);
    });
})
