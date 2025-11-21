import { promises as fsPromises } from 'fs';

import { getExportModuleProperty, } from '../../utils/getExportModuleProperty';
import { ModuleExportProperty } from '../../types/FunctionInfo';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

// モックされた readFile を型安全に扱う
const mockedReadFile = fsPromises.readFile as jest.Mock;

describe('getExportModuleProperty', () => {

  const sampleCode = `
    const funcA = require('funcA');
    const anotherLib = require('another');

    // ケースA: 右辺が Identifier
    module.exports.sync = funcA;

    // ケースB: 右辺が MemberExpression
    module.exports.hasMagic = funcA.hasMagic;

    // ケースC: 右辺が CallExpression
    module.exports.light = funcA.findFiles();

    // 対象外: 右辺が一致しない
    module.exports.other = anotherLib.doSomething;

    // 対象外: 左辺が一致しない
    myExports.prop = funcA;
  `;

  beforeEach(() => {
    mockedReadFile.mockClear();
    jest.restoreAllMocks();
  });

  it('3つのパターン (Identifier, Member, Call) を正しく抽出する', async () => {
    // fs.readFile が sampleCode を返すように設定
    mockedReadFile.mockResolvedValue(sampleCode);

    const result = await getExportModuleProperty('./sample.ts', 'funcA');
    const expected: ModuleExportProperty[] = [
      {
        property_name: 'sync',
        right_func: 'funcA',
      },
      {
        property_name: 'hasMagic',
        right_func: 'funcA.hasMagic',
      },
      {
        property_name: 'light',
        right_func: 'funcA.findFiles()',
      },
    ];

    // 順序不同で内容が一致することを検証
    expect(result).toHaveLength(expected.length);
    expect(result).toEqual(expect.arrayContaining(expected));
  });

  it('一致するパターンがない場合は空配列を返す', async () => {
    mockedReadFile.mockResolvedValue(sampleCode);
    const result = await getExportModuleProperty('./sample.ts', 'nonExistentFunc');
    expect(result).toHaveLength(0);
  });

  it('対象外のファイル拡張子の場合は空配列を返し、fs.readFile を呼ばない', async () => {
    const result = await getExportModuleProperty('./sample.txt', 'funcA');

    expect(result).toHaveLength(0);
    expect(mockedReadFile).not.toHaveBeenCalled();
  });

  it('fs.readFile がエラーを投げた場合、エラーをログ出力し空配列を返す', async () => {
    const mockError = new Error('File not found');
    mockedReadFile.mockRejectedValue(mockError);

    // console.log をスパイ(監視)し、出力を抑制
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    const result = await getExportModuleProperty('./error.ts', 'funcA');

    // 結果が空配列であることを確認
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'getExportModuleProperty: Failed to create AST for file: ./error.ts',
    );
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    // スパイを元に戻す(大事)
    consoleSpy.mockRestore();
  });
});