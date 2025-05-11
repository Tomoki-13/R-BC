import * as t from '@babel/types';
import { extractVariableScopes } from './argument/extractVariableScopes';
import { collectVariableUsageInScopes } from './argument/collectVariableUsageInScopes';
import { ScopeRange, VariableUsage } from '../types/variable_data';

//指定された変数のスコープ情報・代入履歴・使用箇所を抽出
export const rangeArg = (
    parsed: t.File,
    variableName: string,
    fileContent: string,
    nodestart: number = -1
):{values: string[], usages: VariableUsage[], variableScopeRanges: ScopeRange[]} => {
    const variableScopeRanges = extractVariableScopes(parsed, variableName);
    const { values, usages } = collectVariableUsageInScopes(parsed, variableName, fileContent);
    if(nodestart !== -1) {
        return { values, usages, variableScopeRanges };
    }
    else{
        variableScopeRanges.forEach(element => {
            return { values, usages, variableScopeRanges };
        });
    }
    return { values, usages, variableScopeRanges };
};