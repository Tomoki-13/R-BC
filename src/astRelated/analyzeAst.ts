const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { traceArg } from "../utils/traceArg";
import {FunctionInfo} from '../types/FunctionInfo';
export const analyzeAst = async (filePath: string, funcName: string): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', plugins: ["typescript", 'decorators-legacy'] });
            traverse(parsed, {
                VariableDeclarator(path: any) {
                    const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                    if (t.isIdentifier(path.node.init?.callee) && path.node.init.callee.name === '_interopRequireDefault') {
                        const init = path.node.init;
                        if (init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && arg.name.includes(funcName))) {
                            const code: string = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                            codes.push(code);
                        }
                    } else if (t.isMemberExpression(path.node.init) && path.node.init.property.name === 'default') {
                        //.default対応
                        const code = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                        codes.push(code);
                    }
                },
                CallExpression(path: any) {
                    //関数の呼び出しを見つける
                    if (t.isIdentifier(path.node.callee)) {
                        if (path.node.callee.name.includes(funcName)) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        }
                    } else if (t.isMemberExpression(path.node.callee)) {
                        if (t.isIdentifier(path.node.callee.object) && path.node.callee.object.name.includes(funcName)) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            //mockを行で削除
                            // if(!code.includes('mockImplementation')){
                            //     codes.push(code);
                            // }
                            codes.push(code);
                        } else if (path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                            //~~.default.~~()の取得
                            if (path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object)&&path.node.callee.object.object.name.includes(funcName)) {
                                const code: string = fileContent.substring(path.node.start, path.node.end);
                                codes.push(code);
                            }
                        }
                    }
                },NewExpression(path: any) {
                    // NewExpression:returnにマッチ
                    if (t.isIdentifier(path.node.callee)) {
                        if (path.node.callee.name === funcName) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        }
                    } else if (t.isMemberExpression(path.node.callee)) {
                        if (t.isIdentifier(path.node.callee.object) && path.node.callee.object.name === funcName) {
                            const code: string = fileContent.substring(path.node.start, path.node.end);
                            codes.push(code);
                        } else if (path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                            //~~.default.~~の取得
                            if (path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object) && path.node.callee.object.object.name === funcName) {
                                const code: string = fileContent.substring(path.node.start, path.node.end);
                                codes.push(code);
                            }
                        }
                    }
                },
            });
        }
        if (codes.length > 0) {
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        //console.log(`analyzeAst: Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}

//置き換え処理追加後
export const argplace = async (filePath: string, funcName: string): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', plugins: ["typescript", 'decorators-legacy'] });
            traverse(parsed, {
                CallExpression(path: any) {
                    // 関数の呼び出しを見つける
                    if (t.isIdentifier(path.node.callee) && path.node.callee.name.includes(funcName)) {
                        let code = fileContent.substring(path.node.start, path.node.end);
                        if (path.node.arguments.length > 0) {
                            //~~()の部分
                            let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
                            //置き換え先
                            let toplaceword: string = placeword;
                            for (let i = 0; i < path.node.arguments.length - 1; i++) {
                                const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
                                //a to name
                                let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
                                if (toword.length > 0) {
                                    //置き換え
                                    toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                }
                            }
                            if (placeword != toplaceword) {
                                code = code.replace(new RegExp(placeword), toplaceword);
                            }
                        }
                        codes.push(code);
                    } else if (t.isMemberExpression(path.node.callee)) {
                        if (t.isIdentifier(path.node.callee.object) && path.node.callee.object.name.includes(funcName)) {
                            let code = fileContent.substring(path.node.start, path.node.end);
                            if (path.node.arguments.length > 0) {
                                let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
                                let toplaceword: string = placeword;
                                for (let i = 0; i < path.node.arguments.length - 1; i++) {
                                    const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
                                    let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
                                    if (toword.length > 0) {
                                        toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                    }
                                }
                                if (placeword != toplaceword) {
                                    code = code.replace(new RegExp(placeword), toplaceword);
                                }
                            }
                            codes.push(code);
                        } else if (t.isMemberExpression(path.node.callee.object)) {
                            // ~~.default.~~()の取得
                            if (t.isIdentifier(path.node.callee.object.object)) {
                                if (path.node.callee.object.object.name.includes(funcName)) {
                                    let code = fileContent.substring(path.node.start, path.node.end);
                                    if (path.node.arguments.length > 0) {
                                        let placeword: string = fileContent.substring(path.node.arguments[0].start, path.node.arguments[path.node.arguments.length - 1].end);
                                        let toplaceword: string = placeword;
                                        for (let i = 0; i < path.node.arguments.length - 1; i++) {
                                            const variableName: string = fileContent.substring(path.node.arguments[i].start, path.node.arguments[i].end);
                                            let toword: string = traceArg(parsed, variableName, fileContent, path.node.arguments[i].start);
                                            if (toword.length > 0) {
                                                toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                            }
                                        }
                                        if (placeword != toplaceword) {
                                            code = code.replace(new RegExp(placeword), toplaceword);
                                        }
                                    }
                                    codes.push(code);
                                }
                            }
                        }
                    }
                },
            });
        }
        if (codes.length > 0) {
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
       //console.log(`analyzeAst: Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}