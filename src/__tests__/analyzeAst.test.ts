import {analyzeAst,analyzeExpression} from '../utils/analyzeAst';
import { FunctionInfo} from '../types/FunctionInfo';
describe('analyzeAst.ts test', () => {
    test('Function usage', async () => {
        const expectedOutput:string[] = ['sum(a,b)','sum(b,c)'];
        await expect(analyzeAst('./src/__tests__/InputFile/sample.ts','sum')).resolves.toEqual(expectedOutput);
    });
    test('namespace usage', async () => {
        const expectedOutput:string[] = ["FuncA.greet('World')", 'FuncA.add(2, 3)'];
        //pathはsrcから
        await expect(analyzeAst('./src/__tests__/InputFile/sample.ts','FuncA')).resolves.toEqual(expectedOutput);
    });
})
//analyzeExpression(filePath:string,funcName:string)
describe('analyzeExpression test', () => {
    test('Basic usage', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'sum', args: [ 'a','b' ], isExported: true },
            { name: 'subtract', args: [ 'a','b' ], isExported: false },
            { name: 'Hello', args: [  ], isExported: false },
        ];
        await expect(analyzeExpression('./src/__tests__/InputFile/sample.ts', '')).resolves.toEqual(expectedOutput);
    });
    test('export judge', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'add', args: [ 'a', 'b' ], isExported: true },
            { name: 'subtract', args: [ 'a', 'b' ], isExported: true },
            { name: 'Data', args: [ 'c' ], isExported: true },
            { name: 'multiply', args: [ 'a', 'b' ], isExported: false },
            { name: 'divide', args: [ 'a', 'b' ], isExported: false },
            { name: 'power', args: [ 'a', 'b' ], isExported: true }
          ]
        await expect(analyzeExpression('./src/__tests__/InputFile/data1.js', '')).resolves.toEqual(expectedOutput);
    });
})
