import {analyzeAst,analyzeExpression} from '../utils/analyzeAst';
import { FunctionInfo} from '../types/FunctionInfo';
describe('analyzeAst.ts test', () => {
    test('Function usage', async () => {
        const expectedOutput:string[] = ['sum(a,b)','sum(b,c)'];
        await expect(analyzeAst('./src/__tests__/InputFile/sample.ts','sum')).resolves.toEqual(expectedOutput);
    });
    test('namespace usages', async () => {
        const expectedOutput:string[] = ["FuncA.greet('World')", 'FuncA.add(2, 3)'];
        //pathはsrcから
        await expect(analyzeAst('./src/__tests__/InputFile/sample.ts','FuncA')).resolves.toEqual(expectedOutput);
    });
})
//analyzeExpression(filePath:string,funcName:string)
describe('analyzeExpression test', () => {
    test('analyzeExpression usage1', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'sum', args: [ 'a','b' ], isExported: true },
            { name: 'subtract', args: [ 'a','b' ], isExported: false },
            { name: 'Hello', args: [  ], isExported: false },
        ];
        await expect(analyzeExpression('./src/__tests__/InputFile/sample.ts', '')).resolves.toEqual(expectedOutput);
    });
})
