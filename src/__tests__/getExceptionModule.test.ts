import { getExceptionModule } from "../astRelated/getExceptionModule";
describe('getExceptionModule', () => {
    const filePath1:string = "./src/__tests__/InputFile/getExceptionModule/sample1.js";
    const filePath2:string = "./src/__tests__/InputFile/getExceptionModule/sample2.js";
    test('simple example', async () => {
        const expectedOutput:string[] = ['module.exports.someFunction = someModule.someFunction',
            'module.exports.someValue = someModule.someModule'];
        let code:string[] = [];
        code = await getExceptionModule(filePath1,'someModule',code);
        expect(code.map(line => line.trim())).toEqual(expectedOutput.map(line => line.trim()));
    });
    test('globby example', async () => {
        const expectedOutput:string[] = ['module.exports.generateGlobTasks = globby.generateGlobTasks',
            'module.exports.hasMagic = globby.hasMagic'];
        let code:string[] = [];
        code = await getExceptionModule(filePath2,'globby',code);
        expect(code.map(line => line.trim())).toEqual(expectedOutput.map(line => line.trim()));
    });
    test('Without a third argument', async () => {
        const expectedOutput:string[] = ['module.exports.generateGlobTasks = globby.generateGlobTasks',
            'module.exports.hasMagic = globby.hasMagic'];
        let code:string[] = await getExceptionModule(filePath2,'globby');
        expect(code.map(line => line.trim())).toEqual(expectedOutput.map(line => line.trim()));
    });
})
