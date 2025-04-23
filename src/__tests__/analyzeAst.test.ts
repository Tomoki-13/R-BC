import {analyzeAst,argplace} from '../astRelated/analyzeAst';
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
//優先，スコープ，map等の処理をかましたバージョンを作成，サンプルファイルをクライアントから選んでもいい
//まだ失敗
describe('trace argument in file', () => {
    const filePath3:string = "./src/__tests__/InputFile/argment/inFileSample1.ts";
    test('simple', async () => {
        const expectedOutput:string[] = [ 'add(10,9)', 'add(10,10)', 'add(11,10)', 'add(11,8)' ];
        expect(await argplace(filePath3,'add')).resolves.toEqual(expectedOutput);
    });
})
describe('trace argument out files', () => {
    
})
