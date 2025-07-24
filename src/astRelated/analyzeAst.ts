const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { createAstFromFile } from './createAstFromFile';
import { traceArg } from "./argument/traceArg";
import {FunctionInfo} from '../types/FunctionInfo';
//パスと関数名から関数使用部分を抽出　
export const analyzeAst = async (filePath: string, funcName: string): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = createAstFromFile(filePath,fileContent);
            if(parsed === null){
                return [];
            }
            traverse(parsed, {
                VariableDeclarator(path: any) {
                    const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                    if(t.isIdentifier(path.node.init?.callee) && path.node.init.callee.name === '_interopRequireDefault') {
                        const init = path.node.init;
                        if(init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(arg.name))) {
                            const code: string = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                            codes.push(code);
                        }
                    } else if(t.isMemberExpression(path.node.init) &&  path.node.init.name === funcName && path.node.init.property.name === 'default') {
                        //.default対応
                        const code = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                        codes.push(code);
                    }
                },
                CallExpression(path: any) {
                    //関数の呼び出しを見つける　(?![a-zA-Z])類似名した別名を除外
                    if(t.isIdentifier(path.node.callee)) {
                        if(new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.name)) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        }
                    } else if(t.isMemberExpression(path.node.callee)) {
                        if(t.isIdentifier(path.node.callee.object) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.object.name)) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            //mockを行で削除
                            // if(!code.includes('mockImplementation')){
                            //     codes.push(code);
                            // }
                            codes.push(code);
                        } else if(path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                            //~~.default.~~()の取得
                            if(path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.object.object.name)) {
                                const code: string = fileContent.substring(path.node.start, path.node.end);
                                codes.push(code);
                            }
                        }
                    }
                },
                NewExpression(path: any) {
                    // NewExpression:returnにマッチ
                    if(t.isIdentifier(path.node.callee)) {
                        if(new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.name)) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        }
                    } else if(t.isMemberExpression(path.node.callee)) {
                        if(t.isIdentifier(path.node.callee.object) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.object.name)){
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        } else if(path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                            //~~.default.~~の取得
                            if(path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object) &&
                                new RegExp(`^${funcName}(?![a-zA-Z])`).test(path.node.callee.object.object.name)) {
                                const code: string = fileContent.substring(path.node.start, path.node.end);
                                codes.push(code);
                            }
                        }
                    }
                },
            });
        }
        if(codes.length > 0) {
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        //console.log(`analyzeAst: Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}

// //置き換え処理追加後
// export const argplace = async (filePath: string, funcName: string): Promise<string[]> => {
//     let resultArray: string[] = [];
//     try {
//         let codes: string[] = [];
//         //ファイルの内容を取得
//         if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
//             const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
//             const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', plugins: ["typescript", 'decorators-legacy'] });
//             traverse(parsed, {
//                 CallExpression(path: any) {
//                     // 関数の呼び出しを見つける
//                     if(t.isIdentifier(path.node.callee) && path.node.callee.name === funcName) {
//                         let code = fileContent.substring(path.node.start, path.node.end);
//                         if(path.node.arguments.length > 0) {
//                             //~~()の部分　1,2,3
//                             let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
//                             //置き換え先
//                             //console.log('path.node.arguments.length:',path.node.arguments.length);
//                             for(let i = 0; i <= path.node.arguments.length - 1; i++) {
//                                 let toplaceword: string = placeword;
//                                 const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
//                                 //変数名a to name
//                                 //後で定義　変数でないものはそのまま処理したいため条件追加
//                                 // const argument_i: string = fileContent.substring(path.node.start, path.node.end);
//                                 // if(
//                                 //     (argument_i.startsWith(`["'\`]`) && argument_i.endsWith(`["'\`]`)) ||  //文字列'~~'
//                                 //     !(/[^0-9]/.test(argument_i))                                            //数値の場合 123
//                                 // ){
                                    
//                                 // }
//                                 // console.log('path.node.arguments[i]:',path.node.arguments[i].name);
//                                 // console.log('i:',i);
//                                 let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
//                                 if(toword.length > 0) {
//                                     //置き換え 
//                                     // console.log('origin:',placeword);
//                                     // console.log('word1:'+toplaceword);
//                                     toplaceword = toplaceword.replace(new RegExp(variableName), toword);
//                                     //console.log('word2:'+toplaceword);
//                                 }
//                                 function escapeRegExp(str: string): string {
//                                     return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//                                 }
//                                 if(placeword != toplaceword) {
//                                     console.log('true');
//                                     const escaped = escapeRegExp(placeword);
//                                     code = code.replace(new RegExp(escaped), toplaceword);
//                                     placeword = toplaceword;
//                                 }
//                             }
//                         }
//                         codes.push(code);
//                     } else if(t.isMemberExpression(path.node.callee)) {
//                         if(t.isIdentifier(path.node.callee.object) && path.node.callee.object.name === funcName) {
//                             let code = fileContent.substring(path.node.start, path.node.end);
//                             if(path.node.arguments.length > 0) {
//                                 let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
//                                 let toplaceword: string = placeword;
//                                 for(let i = 0; i < path.node.arguments.length - 1; i++) {
//                                     const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
//                                     //関数使用部分のノード開始部分を考慮
//                                     let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
//                                     if(toword.length > 0) {
//                                         toplaceword = toplaceword.replace(new RegExp(variableName), toword);
//                                     }
//                                 }
//                                 if(placeword != toplaceword) {
//                                     code = code.replace(new RegExp(placeword), toplaceword);
//                                 }
//                             }
//                             codes.push(code);
//                         } else if(t.isMemberExpression(path.node.callee.object)) {
//                             // ~~.default.~~()の取得
//                             if(t.isIdentifier(path.node.callee.object.object)) {
//                                 if(path.node.callee.object.object.name === funcName) {
//                                     let code = fileContent.substring(path.node.start, path.node.end);
//                                     if(path.node.arguments.length > 0) {
//                                         let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
//                                         let toplaceword: string = placeword;
//                                         for(let i = 0; i < path.node.arguments.length - 1; i++) {
//                                             const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
//                                             let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
//                                             if(toword.length > 0) {
//                                                 toplaceword = toplaceword.replace(new RegExp(variableName), toword);
//                                             }
//                                         }
//                                         if(placeword != toplaceword) {
//                                             code = code.replace(new RegExp(placeword), toplaceword);
//                                         }
//                                     }
//                                     codes.push(code);
//                                 }
//                             }
//                         }
//                     }
//                 },
//             });
//         }
//         if(codes.length > 0) {
//             resultArray = resultArray.concat(codes);
//         }
//     } catch (error) {
//        //console.log(`analyzeAst: Failed to create AST for file: ${filePath}`);
//         //console.log(error);
//     }
//     return resultArray;
// }