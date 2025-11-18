import * as t from '@babel/types';
import { extractVariableScopes } from './extractVariableScopes';
import { collectVariableUsageInScopes } from './collectVariableUsageInScopes';
import { VariableUsage } from '../types/VariableUsage';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import { getFunc } from '../fileAndmodule/getFunc';
import { FunctionInfo } from '../types/FunctionInfo';
import { FunctionMetaInfo,FunctionInfo_funcRange } from '../types/FunctionMetaInfo';

//指定された変数のスコープ情報・代入履歴・使用箇所を抽出
export const rangeArg = (
    fileContent: string,
    variableName: string,
): VariableUsage[] => {
    const usages: VariableUsage[] = [];
    const parsed = parser.parse(fileContent,
        { sourceType: 'unambiguous', plugins: ['typescript', 'decorators-legacy'] });

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

// --- テスト実行部分 ---
// (async () => {
//     // 実際に解析するファイルのパスを適切に設定してください
//     const targetFilePath = './sample/sample2.ts';
//     const variableName = 'x'; // 調査したい変数名

//     if (!fs.existsSync(targetFilePath)) {
//         console.error(`エラー: 指定されたファイルが見つかりません。パスを確認してください: ${targetFilePath}`);
//         return;
//     }

//     const fileContent = fs.readFileSync(targetFilePath, 'utf-8');
//     const usages = rangeArg(fileContent, 'foo');
//     console.log('usage',JSON.stringify(usages, null, 2));
//     // 変数の使用箇所とスコープの表示
//     if (usages.length > 0) {
//         //クライアント関数内の引数かの判定は完了だが，ファイルごとに適宜処理が必要なため，こいつの位置をusages取得と同じ位置におき，配列にする　
//         const allFunctions: FunctionInfo_funcRange[] = await getFunc(targetFilePath, 1);
//         for (const usage of usages) {
//             // console.log('---使用箇所（スコープ階層付き）---');
//             // console.log(usage.code.join('\n')); // 配列を改行で結合して表示
//             console.log('---変数の有効スコープ範囲（数値）---');
//             console.log(`${usage.varScopeStart}~${usage.varScopeEnd}`);
//             console
//             console.log('\n---引数判定結果---');
//             try {
//                 let isArgument = false;
//                 const allFunctions: FunctionInfo_funcRange[] = await getFunc(targetFilePath, 1);
//                 // console.log('allFunctions:',allFunctions);
//                 for (const func of allFunctions) {
//                     // 関数の中で変数のスコープが完結している
//                     if (func.arg.includes(variableName)&&
//                         typeof func.start === 'number' &&
//                         typeof func.end === 'number' &&
//                         func.start <= usage.varScopeStart&&
//                         func.end >= usage.varScopeEnd

//                     ){
//                         isArgument = true;
//                         console.log(`✔ 変数 '${variableName}' は、関数 '${func.funcname}' の引数に該当します。`);
//                         // 特定の関数名や他の条件でさらに絞り込みたい場合はここに追加できます
//                     }
//                 }
//                 if (!isArgument) {
//                     console.log(`✖ 変数 '${variableName}' は、クライアントが定義した関数の引数ではありません。`);
//                 }
//             } catch (error) {
//                 console.error(`関数の解析中にエラーが発生しました:`, error);
//             }
//         }
//     } else {
//         // console.log(`変数 '${variableName}' のスコープ情報や使用箇所が取得できませんでした。`);
//     }
// })();