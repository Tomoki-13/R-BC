import { importAndPath } from '../utils/importAndPath';
import { ModuleList } from '../types/ModuleList';
describe('importAndPath.ts test', () => {
    const filePath3:string = "./src/__tests__/InputFile/functionSample/funcsample3.ts";
    test('imput relative path', () => {
        const lines = importAndPath(filePath3);
        const expectedOutput:ModuleList[] = [
            {
              code: "import fsPromises from 'fs/promises';",
              modulename: 'fs/promises',
              path: filePath3
            }
            ,
            {
              code: 'import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";',
              modulename: '../../utils/funcNameIdentifiers',
              path: filePath3
            },
            {
              code: 'import { extractImportLines } from "../../utils/extractImportLines";',
              modulename: '../../utils/extractImportLines',
              path: filePath3
            },
            {
                code: "const lodash = require('lodash');",
                modulename: 'lodash',
                path: filePath3
              },
            {
              code: 'import { analyzeAst,argplace } from "../../astRelated/analyzeAst";',
              modulename: '../../astRelated/analyzeAst',
              path: filePath3
            }
          ];
        expect(lines).toEqual(expectedOutput);
    });
})