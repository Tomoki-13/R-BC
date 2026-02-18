import { useAst } from "../core/useAst";
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";
import path from 'path';

const filepath1: string[] = [path.join(__dirname, 'inputFiles/import_require_Sample/importsample.ts')];
const filepath2: string[] = [path.join(__dirname, 'inputFiles/import_require_Sample/requiresample.js')];

const filepath_long_code: string[] = [path.join(__dirname, 'inputFiles/import_require_Sample/long_code.ts')];
const filepath_empty_code: string[] = [path.join(__dirname, 'inputFiles/import_require_Sample/empty_code.ts')];

describe('useAst (mode 0: 抽象化なし)', () => {
  test('import文の抽出が正しく行われること', async () => {
    const output = await useAst(filepath1, "module", 0);

    // useAst は ExtractFunctionCallsResult のオブジェクトを返す
    const expectedOutput: ExtractFunctionCallsResult[][] = [[
      { FunctionCallCode: "import abc from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v4} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v1,v5} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import * as bcd from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v2 as cdf} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] }
    ]];

    // FunctionCallCode などの主要プロパティが一致するか確認
    expect(output).toEqual(expectedOutput);
  });

  test('require文の抽出が正しく行われること', async () => {
    const output = await useAst(filepath2, "module", 0);

    const expectedOutput: ExtractFunctionCallsResult[][] = [[
      { FunctionCallCode: "const abc = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "const bcd = require('module/v4')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "const {v4} = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "const {v1:cdf,v5:def} = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "const efj = require('module').func", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] }
    ]];

    expect(output).toEqual(expectedOutput);
  });
});

describe('useAst (mode 1: 抽象化あり)', () => {
  test('import文の抽象化が正しく行われること', async () => {
    const output = await useAst(filepath1, "module", 1);

    const expectedOutput: ExtractFunctionCallsResult[][] = [[
      { FunctionCallCode: "import ---1 from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v4} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v1,v5} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import * as ---2 from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "import {v2 as ---3} from 'module'", filePath: filepath1[0], line: 0, argTypes: [[]], argContexts: [[]] }
    ]];

    expect(output).toEqual(expectedOutput);
  });

  test('require文の抽象化が正しく行われること', async () => {
    const output = await useAst(filepath2, "module", 1);

    // const や let は除去され、変数が ---番号 に置換される
    const expectedOutput: ExtractFunctionCallsResult[][] = [[
      { FunctionCallCode: "---1 = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "---2 = require('module/v4')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "{v4} = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "{v1:---3,v5:---4} = require('module')", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] },
      { FunctionCallCode: "---5 = require('module').func", filePath: filepath2[0], line: 0, argTypes: [[]], argContexts: [[]] }
    ]];

    expect(output).toEqual(expectedOutput);
  });
});

describe('useAst エッジケースの検証', () => {

  test('400文字を超えるコード行が除外されること', async () => {
    const output = await useAst(filepath_long_code, "module", 0);
    expect(output.every(subArray => subArray.every(item => item.FunctionCallCode.length <= 400))).toBeTruthy();
  });

  test('空のコード行が除外されること', async () => {
    const output = await useAst(filepath_empty_code, "module", 0);
    // FunctionCallCode が空文字 ('') のものが残っていないことを確認
    expect(output.every(subArray => subArray.every(item => item.FunctionCallCode.length > 0))).toBeTruthy();
  });
});