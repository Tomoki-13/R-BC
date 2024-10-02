import { importAndPath } from '../utils/importAndPath';
import { ModuleList } from '../types/ModuleList';
describe('importAndPath.ts test', () => {
    test('imput relative path', () => {
        const filePath:string = "./src/__tests__/InputFile/sample3.ts";
        const lines = importAndPath(filePath);
        const expectedOutput:ModuleList[] = [
            {
                 code: "import fsPromises from 'fs/promises';",
              modulename: 'fs/promises',
              path: './src/__tests__/InputFile/sample3.ts'
            }
            ,
            {
              code: 'import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";',
              modulename: '../../utils/funcNameIdentifiers',
              path: './src/__tests__/InputFile/sample3.ts'
            },
            {
              code: 'import { extractImportLines } from "../../utils/extractImportLines";',
              modulename: '../../utils/extractImportLines',
              path: './src/__tests__/InputFile/sample3.ts'
            },
            {
                code: "const lodash = require('lodash');",
                modulename: 'lodash',
                path: './src/__tests__/InputFile/sample3.ts'
              },
            {
              code: 'import { analyzeAst,argplace } from "../../astRelated/analyzeAst";',
              modulename: '../../astRelated/analyzeAst',
              path: './src/__tests__/InputFile/sample3.ts'
            }
          ];
        expect(lines).toEqual(expectedOutput);
    });
})