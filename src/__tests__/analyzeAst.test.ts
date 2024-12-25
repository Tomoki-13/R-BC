import {analyzeAst} from '../astRelated/analyzeAst';
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
    test('.default case', async () => {
        const expectedOutput:string[] = ['_uuid2.default.v4()'];
        await expect(analyzeAst('./src/__tests__/InputFile/sample2.js','_uuid2')).resolves.toEqual(expectedOutput);
    });
})
