import {getFunc} from '../utils/getFunc';
import { FunctionInfo} from '../types/FunctionInfo';
//getFunc(filePath:string,funcName:string)
describe('getFunc test', () => {
    test('Basic usage', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'Data', args: [ 'c' ], isExported: true },
            { name: 'multiply', args: [ 'a', 'b' ], isExported: false },
            { name: 'power', args: [ 'a', 'b' ], isExported: true }
          ];
        await expect(getFunc('./src/__tests__/InputFile/data1.js','add')).resolves.toEqual(expectedOutput);
    });
    
})
