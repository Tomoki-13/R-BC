import { analyzeMethod } from '../astRelated/analyzer/analyzeMethod';
describe('analyzeMethod.ts test', () => {
  const filePath1: string = "./src/__tests__/inputFiles/functionSample/funcsample.ts";
  const filePath2: string = "./src/__tests__/inputFiles/functionSample/funcsample2.js";
  test('Function usage', async () => {
    const expectedOutput: string[] = ['sum(a, b)', 'sum(b, c)'];
    await expect(analyzeMethod(filePath1, 'sum')).resolves.toEqual(expectedOutput);
  });
  test('namespace usage', async () => {
    const expectedOutput: string[] = ["FuncA.greet('World')", 'FuncA.add(2, 3)'];
    //pathはsrcから
    await expect(analyzeMethod(filePath1, 'FuncA')).resolves.toEqual(expectedOutput);
  });
  test('.default case', async () => {
    const expectedOutput: string[] = ['_uuid2.default.v4()'];
    await expect(analyzeMethod(filePath2, '_uuid2')).resolves.toEqual(expectedOutput);
  });
})
describe('trace argument out files', () => {

})
