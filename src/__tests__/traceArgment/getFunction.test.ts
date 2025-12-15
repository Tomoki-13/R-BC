import * as path from 'path';
import * as fs from 'fs';

import { getFunction } from "../../astRelated/trace/getFunction";
import { FunctionInfo_funcRange } from '../../types/FunctionInfo';

describe('getFunction test', () => {
  const filePath1: string = "./src/__tests__/inputFiles/functionSample/getFunc_default.js";
  const filePath2: string = "./src/__tests__/inputFiles/functionSample/getFunc_sub.js";
  const outputPath = path.resolve(__dirname, '../outputFiles/getFunctionData.json');
  const jsonData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  test('get only exportedFunctions', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData["exportedFunctions"];
    const actual = await getFunction(filePath1, 0);
    expect(actual).toEqual(expected);
  });

  test('get all functions', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData.allFunctions;
    const actual = await getFunction(filePath1, 1);
    expect(actual).toEqual(expected);
  });

  test('get only exportedFunctions_sub', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData.exportedFunctions_sub;
    const actual = await getFunction(filePath2, 0);
    expect(actual).toEqual(expected);
  });

  test('get all functions_sub', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData.allFunctions_sub;
    const actual = await getFunction(filePath2, 1);
    expect(actual).toEqual(expected);
  });
})
