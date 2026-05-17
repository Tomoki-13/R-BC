import patternConversion from '../patternOperations/patternConversion';
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';

// patternUtils をモック化（formatAndIntegratePattern の単体テストを独立させるため）
jest.mock('../patternOperations/patternUtils', () => ({
  alignNumbersInPattern: jest.fn((pattern: string[][]) => ({
    after: pattern // テスト用に入力をそのまま返すモック
  }))
}));

describe('patternConversion モジュールのテスト', () => {

  describe('escapeFunc', () => {
    it('通常の括弧をエスケープする', () => {
      const input = 'console.log(variable)';
      const expected = 'console.log\\(variable\\)';
      expect(patternConversion.escapeFunc(input)).toBe(expected);
    });

    it('名前付きキャプチャグループ (?<name>...) はエスケープしない', () => {
      const input = 'import (?<variable1>[\\w-]+) from "uuid"';
      expect(patternConversion.escapeFunc(input)).toContain('(?<variable1>[\\w-]+)');
    });

    it('否定先読み (?!...) はエスケープしない', () => {
      const input = 'variable1(?!\\d)';
      expect(patternConversion.escapeFunc(input)).toBe('variable1(?!\\d)');
    });
  });

  describe('extractFunctionCallCodes & restoreExtractFunctionCallsResult', () => {
    const mockData: ExtractFunctionCallsResult[][][] = [
      [
        [
          { FunctionCallCode: 'import * as variable1 from "lib"', filePath: 'a.js', line: 1, argTypes: [], argContexts: [] },
          { FunctionCallCode: 'variable1()', filePath: 'a.js', line: 2, argTypes: [], argContexts: [] }
        ]
      ]
    ];

    it('オブジェクトから文字列(FunctionCallCode)の配列を抽出できる', () => {
      const extracted = patternConversion.extractFunctionCallCodes(mockData);
      expect(extracted).toEqual([
        [
          ['import * as variable1 from "lib"', 'variable1()']
        ]
      ]);
    });

    it('文字列の配列から初期値を持つオブジェクト配列に復元できる', () => {
      const strings = [
        [
          ['import * as variable1 from "lib"', 'variable1()']
        ]
      ];
      const restored = patternConversion.restoreExtractFunctionCallsResult(strings);
      expect(restored[0][0][0].FunctionCallCode).toBe('import * as variable1 from "lib"');
      expect(restored[0][0][0].line).toBe(0); // リストア時は0になる仕様
      expect(restored[0][0][0].filePath).toBe('');
    });
  });

  describe('abstStr & typeAwareAbstStr', () => {
    it('---数字 を正規表現キャプチャグループに変換し、末尾に [^.]*$ を付与する', () => {
      const input: ExtractFunctionCallsResult[][][] = [
        [
          [
            { FunctionCallCode: 'import * as ---1 from "lib"', filePath: '', line: 0, argTypes: [], argContexts: [] }
          ]
        ]
      ];

      const result = patternConversion.typeAwareAbstStr(input);
      const code = result[0][0][0].FunctionCallCode;

      // ---1 が (?<variable1>[\\w-]+) になり、() は抽象化され、末尾に [^.]*$ が付く
      expect(code).toContain('as (?<variable1>[\\w-]+)');
      expect(code).toContain('[^.]*$');
    });
  });

  describe('formatAndIntegratePattern', () => {
    it('余分な空白を削除し、包含される（短い）パターンを削除する', () => {
      const input = [
        ['  import   A from "lib"  ', 'A()'],
        ['import A from "lib"', 'A()', 'A.prop'],
      ];

      const result = patternConversion.formatAndIntegratePattern(input);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual(['import A from "lib"', 'A()', 'A.prop']);
    });
  });

  describe('deduplicateFinalPatterns (variable数字の違いを吸収した統合)', () => {

    it('【正常系】同一クライアント内の異なる記述の重複を統合する', () => {
      const input = [
        [ // 1つのクライアント内に、同じ実装が2ファイル分あるケース
          ['(?<variable2>[\\w-]+) = require("uuid")', 'variable2()'],
          ['(?<variable1>[\\w-]+) = require("uuid")', 'variable1()'] 
        ]
      ];
      const result = patternConversion.deduplicateFinalPatterns(input);
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(1);
      expect(result[0][0]).toEqual(['(?<variable1>[\\w-]+) = require("uuid")', 'variable1()']);
    });

    it('【誤統合防止】一方に import が無い（構造が異なる）場合は統合しない', () => {
      const input = [
        [
          ['import * as variable1 from "uuid/v4"', 'variable1()'],
          ['variable2()']
        ]
      ];
      const result = patternConversion.deduplicateFinalPatterns(input);
      expect(result[0].length).toBe(2);
    });

    it('【正常系】複数変数が登場し、かつ完全に構造が一致すれば統合する', () => {
      const input = [
        [
          ['const variable10 = require("lib")', 'const variable11 = variable10.method()', 'variable11()'],
          ['const variable1 = require("lib")', 'const variable2 = variable1.method()', 'variable2()']
        ]
      ];
      const result = patternConversion.deduplicateFinalPatterns(input);
      expect(result[0].length).toBe(1);
      expect(result[0][0]).toEqual(['const variable1 = require("lib")', 'const variable2 = variable1.method()', 'variable2()']);
    });
  });
});