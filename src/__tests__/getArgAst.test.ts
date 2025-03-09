import {getArgAst} from '../astRelated/argument/getArgAst';
describe('getArgAst', () => {
    const filePath1:string = "./src/__tests__/InputFile/functionSample/funcsample.ts";
    test('no arguments', async () => {
        const expectedOutput:string[][] = [];
        //pathはsrcから
        await expect(getArgAst(filePath1,'Hello')).resolves.toEqual(expectedOutput);
    });
    test('no arguments', async () => {
        const expectedOutput:string[][] = [["5,3"]];
        //pathはsrcから
        await expect(getArgAst(filePath1,'subtract')).resolves.toEqual(expectedOutput);
    });
    test('two elements', async () => {
        const expectedOutput:string[][] = [['a,b'],['b,c']];
        //pathはsrcから
        await expect(getArgAst(filePath1,'sum')).resolves.toEqual(expectedOutput);
    });
})
