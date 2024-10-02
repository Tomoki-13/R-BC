import {extractImportLines,extractImportLinesFull} from "../utils/extractImportLines";
import fs from 'fs';

describe('extractImportLines.ts test', () => {
    test('extractImportLines import', () => {
        const filePath:string = "./src/__tests__/InputFile/sample3.ts";
        const libName:string = 'fs/promises';
        const fileContent: string = fs.readFileSync(filePath, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        const expectedOutput:string[] = ["import fsPromises from 'fs/promises';"];
        expect(lines).toEqual(expectedOutput);
    });
    test('extractImportLines require', () => {
        const filePath:string = "./src/__tests__/InputFile/sample3.ts";
        const libName:string = 'lodash';
        const fileContent: string = fs.readFileSync(filePath, 'utf8');
        const lines = extractImportLines(fileContent,libName);
        const expectedOutput:string[] = ["const lodash = require('lodash');"];
        expect(lines).toEqual(expectedOutput);
    });

    test('extractImportLinesFull', () => {
        const filePath:string = "./src/__tests__/InputFile/sample3.ts";
        const fileContent: string = fs.readFileSync(filePath, 'utf8');
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