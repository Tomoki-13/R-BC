import * as t from '@babel/types';
import { extractVariableScopes } from './argument/extractVariableScopes';
import { collectVariableUsageInScopes } from './argument/collectVariableUsageInScopes';
import { VariableUsage } from '../types/variable_data';
import * as parser from '@babel/parser';
import { createAstFromFile } from './createAstFromFile';


//指定された変数のスコープ情報・代入履歴・使用箇所を抽出
export const rangeArg = (
    filePath:string,
    fileContent: string,
    variableName: string,
): VariableUsage[] => {
    const usages: VariableUsage[] = [];
    const parsed = createAstFromFile(filePath,fileContent);
    if(parsed === null){
        return [];
    }
    
    //変数のスコープ範囲取得
    const variableScopeRanges = extractVariableScopes(parsed, variableName);
    //スコープ範囲ごとの変数の取得
    variableScopeRanges.forEach(element => {
        let parsed_part = parser.parse(fileContent.substring(element.start, element.end),{sourceType: 'unambiguous',
                plugins: [
                    'typescript',
                    'jsx',
                    'decorators-legacy',
                    'classProperties',
                    'classPrivateProperties',
                    'classPrivateMethods',
                    'optionalChaining',
                    'nullishCoalescingOperator'
                ]});
        //console.log('fileContent.substring',fileContent.substring(element.start, element.end));
        const usage:string[] = collectVariableUsageInScopes(parsed_part, variableName, fileContent.substring(element.start, element.end));
        usages.push({code: usage, varScopeStart: element.start,varScopeEnd: element.end});
    });
    //どうやって抽象的に判定するか
    return usages;
};