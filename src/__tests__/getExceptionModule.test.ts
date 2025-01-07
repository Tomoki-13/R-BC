import { getExceptionModule } from "../astRelated/getExceptionModule";
describe('getExceptionModule', () => {
    test('simple example', async () => {
        const expectedOutput:string[] = ['module.exports.someFunction = someModule.someFunction',
            'module.exports.someValue = someModule.someModule'];
        let code:string[] = [];
        code = await getExceptionModule('./src/__tests__/InputFile/getExceptionModule/sample1.js','someModule',code);
        expect(code.map(line => line.trim())).toEqual(expectedOutput.map(line => line.trim()));
    });
    test('globby example', async () => {
        const expectedOutput:string[] = ['module.exports.generateGlobTasks = globby.generateGlobTasks',
            'module.exports.hasMagic = globby.hasMagic'];
        let code:string[] = [];
        code = await getExceptionModule('./src/__tests__/InputFile/getExceptionModule/sample2.js','globby',code);
        expect(code.map(line => line.trim())).toEqual(expectedOutput.map(line => line.trim()));
    });
})
