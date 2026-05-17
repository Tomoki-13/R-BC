import * as t from '@babel/types';
import { extractVariableScopes } from './extractVariableScopes';
import { collectVariableUsageInScopes } from './collectVariableUsageInScopes';
import { VariableUsage } from '../../types/VariableUsage';
import * as parser from '@babel/parser';
import { createAstFromContent } from '../base/createAstFromFile';

/**
 * 指定された変数のスコープ情報・代入履歴を抽出する。
 * callSitePos を指定すると、呼び出し地点を含む最も内側のスコープのみを返す（シャドーイング対応）。
 * @param fileContent 解析対象のファイル内容
 * @param variableName 追跡対象の変数名
 * @param callSitePos 変数が使用されている呼び出し地点の文字オフセット（省略時は全スコープ返却）
 */
export const rangeArg = (
  fileContent: string,
  variableName: string,
  callSitePos?: number,
): VariableUsage[] => {
  const usages: VariableUsage[] = [];
  const parsed = createAstFromContent(fileContent);

  if (!parsed) {
    return usages;
  }

  const variableScopeRanges = extractVariableScopes(parsed, variableName);
  variableScopeRanges.forEach(element => {
    const usage: string[] = collectVariableUsageInScopes(
      parsed,
      variableName,
      fileContent,
      element
    );
    usages.push({ code: usage, varScopeStart: element.start, varScopeEnd: element.end });
  });

  // callSitePos が指定されている場合、呼び出し地点を含むスコープに絞り最も内側を返す
  // 同名変数のシャドーイング時に外側スコープの値を誤って収集することを防ぐ
  if (callSitePos !== undefined && usages.length > 0) {
    const relevant = usages.filter(
      u => u.varScopeStart <= callSitePos && u.varScopeEnd >= callSitePos
    );
    if (relevant.length > 0) {
      // varScopeStart が最大 = 最も内側（最小）のスコープを選択
      relevant.sort((a, b) => b.varScopeStart - a.varScopeStart);
      return [relevant[0]];
    }
  }

  return usages;
};
