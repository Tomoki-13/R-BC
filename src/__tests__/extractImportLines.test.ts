import {extractImportLines,extractImportLinesFull} from "../utils/extractImportLines";
import fs from 'fs';

describe('extractImportLines.ts test', () => {
    const filePath3:string = "./src/__tests__/InputFile/functionSample/funcsample3.ts";
    test('extractImportLines import', () => {
        const libName:string = 'fs/promises';
        const fileContent: string = fs.readFileSync(filePath3, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        const expectedOutput:string[] = ["import fsPromises from 'fs/promises';"];
        expect(lines).toEqual(expectedOutput);
    });
    test('extractImportLines require', () => {
        const libName:string = 'lodash';
        const fileContent: string = fs.readFileSync(filePath3, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        const expectedOutput:string[] = ["const lodash = require('lodash');"];
        expect(lines).toEqual(expectedOutput);
    });

    test('extractImportLinesFull', () => {
        const fileContent: string = fs.readFileSync(filePath3, 'utf8');
        const lines:string[] = extractImportLinesFull(fileContent);
        const expectedOutput: string[] = [
            "import fsPromises from 'fs/promises';",
            'import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";',
            'import { extractImportLines } from "../../utils/extractImportLines";',
            "const lodash = require('lodash');",
            'import { analyzeAst,argplace } from "../../astRelated/analyzeAst";'];
        expect(lines).toEqual(expectedOutput);
    });
})