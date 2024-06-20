import {analyzeExpression} from '../utils/analyzeExpression';
import { FunctionInfo} from '../types/FunctionInfo';
//analyzeExpression(filePath:string,funcName:string)
describe('analyzeExpression test', () => {
    test('Basic usage', async () => {
        const expectedOutput: FunctionInfo[] = [
            { name: 'Data', args: [ 'c' ], isExported: true },
            { name: 'multiply', args: [ 'a', 'b' ], isExported: false },
            { name: 'power', args: [ 'a', 'b' ], isExported: true }
          ];
        await expect(analyzeExpression('./src/__tests__/InputFile/data1.js','add')).resolves.toEqual(expectedOutput);
    });
    
})
