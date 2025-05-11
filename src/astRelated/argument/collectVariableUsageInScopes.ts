import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { VariableUsage } from '../../types/variable_data';
// 指定された変数名に対応するスコープ範囲（複数ある場合も）を抽出
// 入力するparsedは、@babel/parserでパースしたスコープ範囲内のデータを想定
export const collectVariableUsageInScopes = (
    parsed: t.File,
    variableName: string,
    fileContent: string,
):  string[] => {
const usages: string[] = [];
// 変数への代入履歴を取得
traverse(parsed, {
    // 変数宣言の処理
    VariableDeclarator(path) {
        const { id, init } = path.node;
        if (
            t.isIdentifier(id) &&
            id.name === variableName &&
            init &&
            typeof init.start === 'number' &&
            typeof init.end === 'number'
        ) {
            const rhs = fileContent.substring(init.start, init.end);
            usages.push(`${rhs}`);
        }
    },
    // 代入式の処理
    AssignmentExpression(path) {
        const { left, right, operator } = path.node;
        if (
            t.isIdentifier(left) &&
            left.name === variableName &&
            typeof right.start === 'number' &&
            typeof right.end === 'number'
        ) {
            const rhsCode = fileContent.substring(right.start, right.end);
            // +=, -= などは a = a + 1 のように展開する
            const opMap: Record<string, string> = {
            '+=': '+',
            '-=': '-',
            '*=': '*',
            '/=': '/',
            '%=': '%'
            };
            const expandedRhs = opMap[operator]
            ? `${variableName} ${opMap[operator]} ${rhsCode}`
            : `${rhsCode}`;
            usages.push(expandedRhs);
        }
        },
        // 変数使用箇所の処理
        Identifier(path) {
            const node = path.node;
            if(
                node.name === variableName &&
                !t.isVariableDeclarator(path.parent) &&
                !t.isAssignmentExpression(path.parent)
            ) {
                const parent = path.parentPath.node;
                if(typeof parent.start === 'number' && typeof parent.end === 'number'){
                    if(!fileContent.substring(parent.start, parent.end).includes('console.log')){
                        usages.push(fileContent.substring(parent.start, parent.end));
                    }
                }
            }
        }
    });

  return usages;
};