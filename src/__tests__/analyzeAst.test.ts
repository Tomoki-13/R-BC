import {analyzeAst} from '../astRelated/analyzeAst';
describe('analyzeAst.ts test', () => {
    const filePath1:string = "./src/__tests__/InputFile/functionSample/funcsample.ts";
    const filePath2:string = "./src/__tests__/InputFile/functionSample/funcsample2.js";
    test('Function usage', async () => {
        const expectedOutput:string[] = ['sum(a,b)','sum(b,c)'];
        await expect(analyzeAst(filePath1,'sum')).resolves.toEqual(expectedOutput);
    });
    test('namespace usage', async () => {
        const expectedOutput:string[] = ["FuncA.greet('World')", 'FuncA.add(2, 3)'];
        //pathはsrcから
        await expect(analyzeAst(filePath1,'FuncA')).resolves.toEqual(expectedOutput);
    });
    test('.default case', async () => {
        const expectedOutput:string[] = ['_uuid2.default.v4()'];
        await expect(analyzeAst(filePath2,'_uuid2')).resolves.toEqual(expectedOutput);
    });
})
