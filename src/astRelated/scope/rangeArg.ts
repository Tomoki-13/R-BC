import * as t from '@babel/types';
import { extractVariableScopes } from './extractVariableScopes';
import { collectVariableUsageInScopes } from './collectVariableUsageInScopes';
import { VariableUsage } from '../../types/VariableUsage';
import * as parser from '@babel/parser';

//指定された変数のスコープ情報・代入履歴・使用箇所を抽出
export const rangeArg = (
  fileContent: string,
  variableName: string,
): VariableUsage[] => {
  const usages: VariableUsage[] = [];
  const plugins: parser.ParserPlugin[] = [
    'typescript',                // TypeScript構文
    'decorators-legacy',         // デコレーター
    'classProperties',           // クラスのプロパティ
    'classPrivateProperties',    // #プライベートフィールド
    'classPrivateMethods',       // #プライベートメソッド
    'optionalChaining',          // ?.演算子
    'nullishCoalescingOperator', // ??演算子
  ];
  const parsed = parser.parse(fileContent,
    { sourceType: 'unambiguous', plugins });

  //変数のスコープ範囲取得
  const variableScopeRanges = extractVariableScopes(parsed, variableName);
  //スコープ範囲ごとの変数の使用箇所を取得
  variableScopeRanges.forEach(element => {
    const parsed_part = parser.parse(fileContent.substring(element.start, element.end),
      { sourceType: 'unambiguous', plugins: ['typescript', 'decorators-legacy'] });
    const usage: string[] = collectVariableUsageInScopes(parsed_part, variableName, fileContent.substring(element.start, element.end));
    usages.push({ code: usage, varScopeStart: element.start, varScopeEnd: element.end });
  });
  return usages;
};