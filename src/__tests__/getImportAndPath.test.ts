import { getImportAndPath , get_perFunc_importAndPath} from '../utils/getImportAndPath';
import { ModuleList,CallModuleAndFuncList } from '../types/ModuleList';
describe('getImportAndPath test', () => {
    const filePath3:string = "./src/__tests__/InputFile/functionSample/funcsample3.ts";
    test('imput relative path', () => {
        const lines = getImportAndPath(filePath3);
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
describe('get_perFunc_importAndPath test', () => {
  const filePath3:string = "./src/__tests__/InputFile/functionSample/funcsample3.ts";
  test('imput relative path', () => {
      const lines = get_perFunc_importAndPath(filePath3);
      const expectedOutput:CallModuleAndFuncList[] = [
        {
          code: "import fsPromises from 'fs/promises';",
          call_modulename: 'fs/promises',
          funcname: 'fsPromises',
          path: filePath3
        },
        {
          code: 'import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";',
          call_modulename: '../../utils/funcNameIdentifiers',
          funcname: 'funcNameIdentifiers',
          path: filePath3
        },
        {
          code: 'import { funcNameIdentifiers, secfuncNameIdentifiers } from "../../utils/funcNameIdentifiers";',
          call_modulename: '../../utils/funcNameIdentifiers',
          funcname: 'secfuncNameIdentifiers',
          path: filePath3
        },
        {
          code: 'import { extractImportLines } from "../../utils/extractImportLines";',
          call_modulename: '../../utils/extractImportLines',
          funcname: 'extractImportLines',
          path: filePath3
        },
        {
          code: "const lodash = require('lodash');",
          call_modulename: 'lodash',
          funcname: 'lodash',
          path: filePath3
        },
        {
          code: 'import { analyzeAst,argplace } from "../../astRelated/analyzeAst";',
          call_modulename: '../../astRelated/analyzeAst',
          funcname: 'analyzeAst',
          path: filePath3
        },
        {
          code: 'import { analyzeAst,argplace } from "../../astRelated/analyzeAst";',
          call_modulename: '../../astRelated/analyzeAst',
          funcname: 'argplace',
          path: filePath3
        }
      ];
      expect(lines).toEqual(expectedOutput);
  });
})