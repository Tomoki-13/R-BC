import {analyzeAst} from '../utils/analyzeAst';
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
