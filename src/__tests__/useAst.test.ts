import { useAst } from "../combinations/useAst";
describe('useAst', () => {
    test('import', async () => {
        const filepath:string[] = ['./src/__tests__/InputFile/importsample.ts'];
        const output = await useAst(filepath,"module");
        const expectedOutput:string[][]= [[
            "import abc from 'module';",
            "import {v4} from 'module';",
            "import {v1,v5} from 'module';",
            "import * as bcd from 'module';",
            "import {v2 as cdf} from 'module';"
        ]];
        expect(output).toEqual(expectedOutput);
    });
    test('require ', async () => {
        const filepath:string[] = ['./src/__tests__/InputFile/requiresample.js'];
        const output = await useAst(filepath,"module");
        const expectedOutput:string[][]= [[
            "const abc = require('module');",
            "const bcd = require('module/v4');",
            "const {v4} = require('module');",
            "const {v1:cdf,v5:def} = require('module');",
            "const efj = require('module').func;"
        ]];
        expect(output).toEqual(expectedOutput);
    });
});
describe('abstuse', () => {
    test('import', async () => {
        const filepath:string[] = ['./src/__tests__/InputFile/importsample.ts'];
        const output = await useAst(filepath,"module",1);
        const expectedOutput:string[][]= [[
            "import ---1 from 'module'",
            "import {v4} from 'module'",
            "import {v1,v5} from 'module'",
            "import * as ---2 from 'module'",
            "import {v2 as ---3} from 'module'"
        ]];
        expect(output).toEqual(expectedOutput);
    });
    test('require ', async () => {
        const filepath:string[] = ['./src/__tests__/InputFile/requiresample.js'];
        const output = await useAst(filepath,"module",1);
        const expectedOutput:string[][]= [[
            "---1 = require('module')",
            "---2 = require('module/v4')",
            "{v4} = require('module')",
            "{v1:---3,v5:---4} = require('module')",
            "---5 = require('module').func"
        ]];
        expect(output).toEqual(expectedOutput);
    });
});