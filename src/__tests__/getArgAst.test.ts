import {getArgAst} from '../astRelated/argument/getArgAst';
describe('getArgAst', () => {
    test('no arguments', async () => {
        const expectedOutput:string[][] = [];
        //pathはsrcから
        await expect(getArgAst('./src/__tests__/InputFile/sample.ts','Hello')).resolves.toEqual(expectedOutput);
    });
    test('no arguments', async () => {
        const expectedOutput:string[][] = [["5,3"]];
        //pathはsrcから
        await expect(getArgAst('./src/__tests__/InputFile/sample.ts','subtract')).resolves.toEqual(expectedOutput);
    });
    test('two elements', async () => {
        const expectedOutput:string[][] = [['a,b'],['b,c']];
        //pathはsrcから
        await expect(getArgAst('./src/__tests__/InputFile/sample.ts','sum')).resolves.toEqual(expectedOutput);
    });
})
