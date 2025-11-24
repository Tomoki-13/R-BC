import { getImportAndPath } from '../utils/getImportAndPath';
import { ModuleList, CallModuleAndFuncList } from '../types/ModuleList';
describe('getImportAndPath test(mode 1)', () => {
  const filePath3: string = "./src/__tests__/inputFiles/functionSample/funcsample3.ts";
  test('imput relative path', () => {
    const lines = getImportAndPath(filePath3, 1);
    const expectedOutput: ModuleList[] = [
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
        code: 'import { analyzeMethod, argplace } from "../../astRelated/analyzeMethod";',
        modulename: '../../astRelated/analyzeMethod',
        path: filePath3
      }
    ];
    expect(lines).toEqual(expectedOutput);
  });
})
describe('getImportAndPath test(mode 0)', () => {
  const filePath3: string = "./src/__tests__/inputFiles/functionSample/funcsample3.ts";
  test('imput relative path', () => {
    const lines = getImportAndPath(filePath3);
    const expectedOutput: CallModuleAndFuncList[] = [
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
        code: 'import { analyzeMethod, argplace } from "../../astRelated/analyzeMethod";',
        call_modulename: '../../astRelated/analyzeMethod',
        funcname: 'analyzeMethod',
        path: filePath3
      },
      {
        code: 'import { analyzeMethod, argplace } from "../../astRelated/analyzeMethod";',
        call_modulename: '../../astRelated/analyzeMethod',
        funcname: 'argplace',
        path: filePath3
      }
    ];
    expect(lines).toEqual(expectedOutput);
  });
})