import {getFunc} from '../astRelated/getFunc';
import {FunctionInfo} from '../types/FunctionInfo';
//getFunc(filePath:string,funcName:string)
describe('getFunc test', () => {
    test('Basic usage', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'Data', args: [ 'c' ], isExported: true,start: 147,end: 441 },
            { name: 'multiply', args: [ 'a', 'b' ], isExported: false ,start: 474,end: 540},
            { name: 'power', args: [ 'a', 'b' ], isExported: true,start: 604,end: 679 }
          ];
        await expect(getFunc('./src/__tests__/InputFile/data1.js','add')).resolves.toEqual(expectedOutput);
    });
    
})
