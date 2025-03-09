import { useAst } from "../combinations/useAst";
const filepath1:string[] = ['./src/__tests__/InputFile/import_require_Sample/importsample.ts'];
const filepath2:string[] = ['./src/__tests__/InputFile/import_require_Sample/requiresample.js'];
describe('useAst', () => {
    test('import', async () => {
        const output = await useAst(filepath1,"module");
        const expectedOutput:string[][]= [[
            "import abc from 'module'",
            "import {v4} from 'module'",
            "import {v1,v5} from 'module'",
            "import * as bcd from 'module'",
            "import {v2 as cdf} from 'module'"
        ]];
        expect(output).toEqual(expectedOutput);
    });
    test('require ', async () => {
        const output = await useAst(filepath2,"module");
        const expectedOutput:string[][]= [[
            "const abc = require('module')",
            "const bcd = require('module/v4')",
            "const {v4} = require('module')",
            "const {v1:cdf,v5:def} = require('module')",
            "const efj = require('module').func"
        ]];
        expect(output).toEqual(expectedOutput);
    });
});
describe('abstuse', () => {
    test('import', async () => {
        const filepath:string[] = ['./src/__tests__/InputFile/import_require_Sample/importsample.ts'];
        const output = await useAst(filepath1,"module",1);
        const expectedOutput:string[][]= [[
            "import ---1 from 'module'",
            "import {v4} from 'module'",
            "import {v1,v5} from 'module'",
            "import * as ---2 from 'module'",
            "import {v2 as ---3} from 'module'"
        ]];
        expect(output).toEqual(expectedOutput);
    });

});