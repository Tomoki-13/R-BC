import * as path from 'path';
import * as fs from 'fs';

import { getFunction } from "../../astRelated/trace/getFunction";
import { FunctionInfo_funcRange } from '../../types/FunctionInfo';

describe('getFunction test', () => {
  const filePath: string = "./src/__tests__/inputFiles/functionSample/data1.js";
  const outputPath = path.resolve(__dirname, '../outputFiles/getFunctionData.json');
  const jsonData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  test('get only exportedFunctions', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData["exportedFunctions"];
    const actual = await getFunction(filePath, 0);
    expect(actual).toEqual(expected);
  });

  test('get all functions', async () => {
    const expected: FunctionInfo_funcRange[] = jsonData.allFunctions;
    const actual = await getFunction(filePath, 1);
    expect(actual).toEqual(expected);
  });
})
