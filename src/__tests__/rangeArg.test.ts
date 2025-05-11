import { rangeArg } from '../astRelated/rangeArg';
import { VariableUsage } from '../types/variable_data';
import fs from 'fs';

describe('rangeArg test', () => {
    const filePath1:string = "./src/__tests__/InputFile/argment/rangeArgFile.ts";
    test('Basic usage', async () => {
        const fileContent = fs.readFileSync(filePath1, 'utf-8');
        const usages:VariableUsage[] = rangeArg(fileContent, 'foo');
        const expectedOutput:VariableUsage[] = [
            {
                code: ['1', 'foo + 2', 'foo + 3', 'foo * x'],
                varScopeStart: 36,
                varScopeEnd: 189,
            },
            {
                code: [ '0', '0', 'foo + 0', 'foo * x' ],
                varScopeStart: 217,
                varScopeEnd: 364,
            },
        ];
        await expect(usages).resolves.toEqual(expectedOutput);
    });
})
