import {getArgAst} from '../utils/getArgAst';
test('Extract arguments from source code', async () => {
    const expectedOutput = [['a,b']];
    //pathはsrcから
    await expect(getArgAst('./src/__tests__/InputFile/sample.ts', 'sum')).resolves.toEqual(expectedOutput);
});