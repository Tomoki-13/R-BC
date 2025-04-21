import {getFunc} from '../astRelated/getFunc';
import {FunctionInfo} from '../types/FunctionInfo';
import { analyzeAst } from '../astRelated/analyzeAst';
//getFunc(filePath:string,funcName:string)
describe('getFunc test', () => {
    const filePath1:string = "./src/__tests__/InputFile/functionSample/data1.js";
    test('Basic usage', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'Data', args: [ 'c' ], isExported: true,start: 116,end: 410 },
            { name: 'multiply', args: [ 'a', 'b' ], isExported: false ,start: 443,end: 509},
            { name: 'power', args: [ 'a', 'b' ], isExported: true,start: 573,end: 648 }
          ];
        await expect(getFunc(filePath1,'add')).resolves.toEqual(expectedOutput);
    });
    // test('no funcName', async () => {
    //     const expectedOutput: FunctionInfo[] = [
        // { name: 'Data', args: [ 'c' ], isExported: true,start: 116,end: 410 },
        // { name: 'multiply', args: [ 'a', 'b' ], isExported: false ,start: 443,end: 509},
        // { name: 'power', args: [ 'a', 'b' ], isExported: true,start: 573,end: 648 }
    //     ];
    //     await expect(getFunc(filePath1,'')).resolves.toEqual(expectedOutput);
    // });
})
