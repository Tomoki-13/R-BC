import * as path from 'path';
import * as fs from 'fs';

import { getFunction } from "../../astRelated/trace/getFunction";
import { FunctionInfo_funcRange } from '../../types/FunctionInfo';

describe('getFunction test', () => {
  const filePath1: string = "./src/__tests__/inputFiles/functionSample/data1.js";
  const filePath2: string = "./src/__tests__/inputFiles/functionSample/data1_defaultValue.js";
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

  test('value is set for the argument', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData.setDefaultValue;
    const actual = await getFunction(filePath2, 1);
    expect(actual).toEqual(expected);
  });
})
