import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { VariableUsage } from '../../types/variable_data';
// 指定された変数名に対応するスコープ範囲（複数ある場合も）を抽出
// 入力するparsedは、@babel/parserでパースしたスコープ範囲内のデータを想定
export const collectVariableUsageInScopes = (
    parsed: t.File,
    variableName: string,
    fileContent: string,
): {
    values: string[],
    usages: VariableUsage[]
} => {
const values: string[] = [];
const usages: VariableUsage[] = [];
// 変数への代入履歴を取得
traverse(parsed, {
    // 変数宣言の処理
    VariableDeclarator(path) {
    const node = path.node;
    if(
        t.isIdentifier(node.id) &&
        node.id.name === variableName &&
        node.init &&
        typeof node.init.start === 'number' &&
        typeof node.init.end === 'number' 
    ) {
        values.push(fileContent.substring(node.init.start, node.init.end));
    }
    },
    // 代入式の処理
    AssignmentExpression(path) {
        const node = path.node;
        if(
            t.isIdentifier(node.left) &&
            node.left.name === variableName &&
            typeof node.right.start === 'number' &&
            typeof node.right.end === 'number' &&
            typeof node.end === 'number' 
        ){
            const rightCode = fileContent.substring(node.right.start, node.right.end);
            const rhs = ['+=', '-=', '*=', '/='].includes(node.operator)
            ? `${variableName} ${node.operator[0]} ${rightCode}`
            : rightCode;
            values.push(rhs);
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
                const scopeStack: string[] = [];
                let current: any = path;

                while (current) {
                    const blockNode = current.node;
                    if (t.isFunctionDeclaration(blockNode)) {
                    scopeStack.unshift(`function:${blockNode.id?.name || '<anonymous>'}`);
                    } else if (t.isFunctionExpression(blockNode)) {
                    scopeStack.unshift(`function:${(blockNode as t.FunctionExpression).id?.name || '<anonymous>'}`);
                    } else if (t.isArrowFunctionExpression(blockNode)) {
                    scopeStack.unshift('function:<anonymous>');
                    } else if (t.isIfStatement(blockNode)) {
                    scopeStack.unshift('if');
                    } else if (t.isForStatement(blockNode)) {
                    scopeStack.unshift('for');
                    } else if (t.isWhileStatement(blockNode)) {
                    scopeStack.unshift('while');
                    } else if (t.isBlockStatement(blockNode)) {
                    scopeStack.unshift('block');
                    } else if (t.isProgram(blockNode)) {
                    scopeStack.unshift('program');
                    }
                current = current.parentPath;
            }

            usages.push({
                type: parent.type,
                code: fileContent.substring(parent.start, parent.end),
                scopePath: scopeStack.join(' > ')
            });
            }
        }
    }
  });

  return { values, usages };
};