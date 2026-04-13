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
      // uuidの後の括弧などは通常通り処理される
      expect(patternConversion.escapeFunc(input)).toContain('(?<variable1>[\\w-]+)');
    });

    it('否定先読み (?!...) はエスケープしない', () => {
      const input = '---1(?!\\d)';
      expect(patternConversion.escapeFunc(input)).toBe('---1(?!\\d)');
    });
  });

  describe('extractFunctionCallCodes & restoreExtractFunctionCallsResult', () => {
    const mockData: ExtractFunctionCallsResult[][][] = [
      [
        [
          { FunctionCallCode: 'import * as ---1 from "lib"', filePath: 'a.js', line: 1, argTypes: [], argContexts: [] },
          { FunctionCallCode: '---1()', filePath: 'a.js', line: 2, argTypes: [], argContexts: [] }
        ]
      ]
    ];

    it('オブジェクトから文字列(FunctionCallCode)の配列を抽出できる', () => {
      const extracted = patternConversion.extractFunctionCallCodes(mockData);
      expect(extracted).toEqual([
        [
          ['import * as ---1 from "lib"', '---1()']
        ]
      ]);
    });

    it('文字列の配列から初期値を持つオブジェクト配列に復元できる', () => {
      const strings = [
        [
          ['import * as ---1 from "lib"', '---1()']
        ]
      ];
      const restored = patternConversion.restoreExtractFunctionCallsResult(strings);
      expect(restored[0][0][0].FunctionCallCode).toBe('import * as ---1 from "lib"');
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
        ['  import   A from "lib"  ', 'A()'], // 余分な空白がある
        ['import A from "lib"', 'A()', 'A.prop'], // 上記を完全に包含する長いパターン
      ];
      
      const result = patternConversion.formatAndIntegratePattern(input);
      
      // 短い方（インデックス0）は削除され、長い方だけが残り空白が正規化される
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(['import A from "lib"', 'A()', 'A.prop']);
    });
  });

  describe('deduplicatePatterns (---数字の違いを吸収した統合)', () => {
    
    it('【正常系】---数字のみが異なり、構造が完全に一致する場合は数字が小さい方を残す', () => {
      const input = [
        ['import * as ---3 from "uuid/v4"', '---3()'], // 数字が大きい
        ['import * as ---1 from "uuid/v4"', '---1()'], // 数字が小さい（こちらが残るべき）
        ['import * as ---2 from "uuid/v4"', '---2()']
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(['import * as ---1 from "uuid/v4"', '---1()']);
    });

    it('【誤統合防止】一方に import が無い（構造が異なる）場合は統合しない', () => {
      const input = [
        ['import * as ---1 from "uuid/v4"', '---1()'], // import + call
        ['---2()'] // call のみ (importが存在しない)
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(2); // 別のパターンとして両方残るべき
    });

    it('【誤統合防止】一方に関数呼び出し(call) が無い場合は統合しない', () => {
      const input = [
        ['import * as ---1 from "uuid/v4"', '---1()'], // import + call
        ['import * as ---2 from "uuid/v4"'] // import のみ (callが存在しない)
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(2);
    });

    it('【誤統合防止】import元のライブラリ名など、静的な文字列が異なる場合は統合しない', () => {
      const input = [
        ['import * as ---1 from "uuid/v4"', '---1()'],
        ['import * as ---2 from "uuid/v5"', '---2()'] // "v4" と "v5" で文字列が違う
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(2);
    });

    it('【誤統合防止】複数の変数が登場する際、構造や位置が違えば統合しない', () => {
      const input = [
        ['const ---1 = require("lib")', 'const ---2 = ---1()', '---2()'],
        ['const ---3 = require("lib")', '---3()'] // ---4(中間変数)が無い
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(2);
    });

    it('【正常系】複数変数が登場し、かつ完全に構造が一致すれば統合する', () => {
      const input = [
        ['const ---10 = require("lib")', 'const ---11 = ---10.method()', '---11()'],
        ['const ---1 = require("lib")',  'const ---2 = ---1.method()',  '---2()']
      ];
      const result = patternConversion.deduplicatePatterns(input);
      expect(result.length).toBe(1);
      // 数字の最小値が小さい方 (---1 のセット) が残る
      expect(result[0]).toEqual(['const ---1 = require("lib")', 'const ---2 = ---1.method()', '---2()']);
    });
  });

});