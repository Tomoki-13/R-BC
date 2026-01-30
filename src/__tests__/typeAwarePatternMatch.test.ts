import { typeAwarePatternMatch } from "../patternOperations/typeAwarePatternMatch";
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";

describe('typeAwarePatternMatch test', () => {

  describe('Mode 0: コードのみのマッチング (patternMatchからの移行)', () => {
    
    /**
     * string[][] (ファイルごとの行) を ExtractFunctionCallsResult[][] (ファイル単位の解析結果) に変換
     * 実装関数が2次元配列(ファイル>行)を期待しているため、構造を維持します。
     */
    const wrapUser = (patterns: string[][]): ExtractFunctionCallsResult[][] => {
      return patterns.map((fileLines, fileIndex) =>
        fileLines.map((line, lineIndex) => ({
          FunctionCallCode: line,
          filePath: `test_file_${fileIndex}.ts`, // ダミーパス
          line: lineIndex + 1,                   // ダミー行番号
          argTypes: [],
          argContexts: [],
        }))
      );
    };

    const basicImportPattern: ExtractFunctionCallsResult[][][] = [[
      [
        { FunctionCallCode: "import variable1 from 'module1'", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
        { FunctionCallCode: "variable1()", filePath: 'p', line: 0, argTypes: [], argContexts: [] }
      ]
    ]];

    const requirePattern: ExtractFunctionCallsResult[][][] = [[
      [
        { FunctionCallCode: "var variable2 = require('module')", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
        { FunctionCallCode: "variable2", filePath: 'p', line: 0, argTypes: [], argContexts: [] }
      ]
    ]];

    const interopPattern: ExtractFunctionCallsResult[][][] = [[
      [
        { FunctionCallCode: "var variable1 = require('module')", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
        { FunctionCallCode: "var variable2 = _interopRequireDefault(variable1)", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
        { FunctionCallCode: "variable2()", filePath: 'p', line: 0, argTypes: [], argContexts: [] }
      ]
    ]];

    test('基本機能の使用', async () => {
      // ファイル単位の配列にラップ: [ [Line1, Line2] ]
      const userResults: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "import v1 from 'module1'", filePath: 'test.ts', line: 1, argTypes: [], argContexts: [] },
        { FunctionCallCode: "v1()", filePath: 'test.ts', line: 2, argTypes: [], argContexts: [] }
      ]];

      const [isMatch] = await typeAwarePatternMatch(userResults, basicImportPattern, 0);
      expect(isMatch).toEqual(true);
    });

    test('不一致のケース (呼び出し不足)', async () => {
      const userResults: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "import v1 from 'module1'", filePath: 'test.ts', line: 1, argTypes: [], argContexts: [] }
      ]];

      const [isMatch] = await typeAwarePatternMatch(userResults, basicImportPattern, 0);
      expect(isMatch).toEqual(false);
    });

    test('不一致のケース (モジュール不一致)', async () => {
      const userResults: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "import v1 from 'module1'", filePath: 'test.ts', line: 1, argTypes: [], argContexts: [] },
        { FunctionCallCode: "v1()", filePath: 'test.ts', line: 2, argTypes: [], argContexts: [] }
      ]];

      const multiModulePattern: ExtractFunctionCallsResult[][][] = [[
        [
          { FunctionCallCode: "import variable2 from 'module2'", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
          { FunctionCallCode: "variable2()", filePath: 'p', line: 0, argTypes: [], argContexts: [] },
          { FunctionCallCode: "import variable3 from 'module1'", filePath: 'p', line: 0, argTypes: [], argContexts: [] }
        ]
      ]];

      const [isMatch] = await typeAwarePatternMatch(userResults, multiModulePattern, 0);
      expect(isMatch).toEqual(false);
    });

    test('requireの使用', async () => {
      const rawUserPatterns = [
        ["var v2 = require('module')", "v2"]
      ];
      const userResults = wrapUser(rawUserPatterns);

      const [isMatch] = await typeAwarePatternMatch(userResults, requirePattern, 0);
      expect(isMatch).toEqual(true);
    });

    test('interopRequireDefaultの使用', async () => {
      const userResults: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "var v2 = require('module')", filePath: 'test.ts', line: 1, argTypes: [], argContexts: [] },
        { FunctionCallCode: "var v1 = _interopRequireDefault(v2)", filePath: 'test.ts', line: 2, argTypes: [], argContexts: [] },
        { FunctionCallCode: "v1()", filePath: 'test.ts', line: 3, argTypes: [], argContexts: [] }
      ]];

      const [isMatch] = await typeAwarePatternMatch(userResults, interopPattern, 0);
      expect(isMatch).toEqual(true);
    });
  });

  describe('Mode 1: 型情報を考慮したマッチング', () => {
    // 共通で使用する検索パターン定義 (Type-Aware)
    const targetTypeAwarePattern: ExtractFunctionCallsResult[][][] = [
      [
        [
          {
            FunctionCallCode: "(?<variable1>[\\w-]+) = require([\"'`]fs[\"'`])[^.]*",
            filePath: 'pattern',
            line: 0,
            argTypes: [[]],
            argContexts: [[]]
          },
          {
            FunctionCallCode: "variable1([^,]*,[^,]*)[^.]*",
            filePath: 'pattern',
            line: 0,
            argTypes: [['String'], ['String']],
            argContexts: [[]]
          }
        ]
      ]
    ];

    test('型が一致する場合にマッチすること（成功ケース）', async () => {
      // Case A: 成功パターン (型が一致)
      const userDataSuccess: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "const fs = require('fs')", filePath: 'test.ts', line: 1, argTypes: [[]], argContexts: [[]] },
        { FunctionCallCode: "fs('file.txt', 'content')", filePath: 'test.ts', line: 2, argTypes: [['String'], ['String']], argContexts: [[]] }
      ]];

      const expectedOutput: boolean = true;
      const [isMatch, matchedPattern] = await typeAwarePatternMatch(userDataSuccess, targetTypeAwarePattern, 1);

      expect(isMatch).toEqual(expectedOutput);
      expect(matchedPattern).not.toBeNull();
    });

    test('型が異なる場合にマッチしないこと（失敗ケース）', async () => {
      // Case B: 失敗パターン (第2引数が Number で型不一致)
      const userDataFail: ExtractFunctionCallsResult[][] = [[
        { FunctionCallCode: "const fs = require('fs')", filePath: 'test.ts', line: 1, argTypes: [[]], argContexts: [[]] },
        { FunctionCallCode: "fs('file.txt', 12345)", filePath: 'test.ts', line: 2, argTypes: [['String'], ['Number']], argContexts: [[]] }
      ]];

      const expectedOutput: boolean = false;
      const [isMatch, matchedPattern] = await typeAwarePatternMatch(userDataFail, targetTypeAwarePattern, 1);

      expect(isMatch).toEqual(expectedOutput);
      expect(matchedPattern).toBeNull();
    });
  });
});