//少し特殊な実装方法を取得するための機能
const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { module_export_prperty } from "../types/FunctionInfo";

// module.exports.propertyを持つか否かの抽出
export const getExceptionModule = async (filePath: string, funcName: string,codes:string[]=[]): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        //ファイルの内容を取得
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', plugins: ["typescript", 'decorators-legacy'] });
            //module.exports.propertyでの種類 例：module.exports.hasMagic
            traverse(parsed, {
                AssignmentExpression(path: any) {
                    if(
                        t.isMemberExpression(path.node.left) &&
                        t.isMemberExpression(path.node.left.object) &&
                        t.isIdentifier(path.node.left.object.object) && path.node.left.object.object.name === "module" &&
                        t.isIdentifier(path.node.left.object.property) && path.node.left.object.property.name === "exports" && 
                        t.isIdentifier(path.node.left.property)
                    ){
                        if(t.isMemberExpression(path.node.right) && t.isIdentifier(path.node.right.object) &&
                            path.node.right.object.name === funcName) {
                            const code: string = fileContent.substring(path.node.start!, path.node.end!);
                            codes.push(code);
                        }
                    }
                },
            });
        }
        if(codes.length > 0) {
            console.log(`codes ${codes}`);
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`getExceptionModule: Failed to create AST for file: ${filePath}`);
        console.log(error);
    }
    return resultArray;
}


export const getExceptionModule2 = async (
    filePath: string,
    funcName: string,
    codes: string[] = []
): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {
                sourceType: 'unambiguous',
                plugins: ['typescript', 'decorators-legacy'],
            });

            traverse(parsed, {
                AssignmentExpression(path) {
                    const { node } = path;

                    // module.exports.xxx = xxx
                    if(
                        t.isMemberExpression(node.left) &&
                        t.isMemberExpression(node.left.object) &&
                        t.isIdentifier(node.left.object.object, { name: 'module' }) &&
                        t.isIdentifier(node.left.object.property, { name: 'exports' }) &&
                        t.isIdentifier(node.left.property)
                    ) {
                        // ￥module.exports.hasMagic = lib.someFunc;
                        if(t.isMemberExpression(path.node.right) && t.isIdentifier(path.node.right.object) &&
                            path.node.right.object.name === funcName) {
                            const code: string = fileContent.substring(path.node.start!, path.node.end!);
                            codes.push(code);
                        }
                        //module.exports.light = lib.findFiles();とマッチ
                        if(
                            t.isCallExpression(node.right) &&
                            t.isMemberExpression(node.right.callee) &&
                            t.isIdentifier(node.right.callee.object, { name: funcName })
                        ) {
                            const code = fileContent.substring(node.start!, node.end!);
                            codes.push(code);
                        }

                        //右辺が Identifier の場合：module.exports.hasMagic = someFunc;
                        if(t.isIdentifier(node.right) && node.right.name === funcName) {
                            const code = fileContent.substring(node.start!, node.end!);
                            codes.push(code);
                        }

                        //右辺がExpression：module.exports.hasMagic = function funcName() { ... };
                        // if(
                        //     t.isFunctionExpression(node.right) &&
                        //     node.right.id &&
                        //     node.right.id.name === funcName
                        // ) {
                        //     const code = fileContent.substring(node.start!, node.end!);
                        //     codes.push(code);
                        // }
                    }
                },
            });
        }

        if(codes.length > 0) {
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`getExceptionModule: Failed to create AST for file: ${filePath}`);
        console.log(error);
    }

    return resultArray;
};

export const getExceptionModule3 = async (
    filePath: string,
    funcName: string,
     codes: module_export_prperty[] = []
): Promise<module_export_prperty[]> => {
    let resultArray: module_export_prperty[] = [];
    try {
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {
                sourceType: 'unambiguous',
                plugins: ['typescript', 'decorators-legacy'],
            });

            traverse(parsed, {
                AssignmentExpression(path) {
                    const { node } = path;
                    // module.exports.xxx = xxx
                    if(
                        t.isMemberExpression(node.left) &&
                        t.isMemberExpression(node.left.object) &&
                        t.isIdentifier(node.left.object.object, { name: 'module' }) &&
                        t.isIdentifier(node.left.object.property, { name: 'exports' }) &&
                        t.isIdentifier(node.left.property)
                    ) {
                        // ￥module.exports.hasMagic = lib.someFunc;
                        if(t.isMemberExpression(path.node.right) && t.isIdentifier(path.node.right.object) &&
                            path.node.right.object.name === funcName) {
                            const code: string = fileContent.substring(path.node.right.start!, path.node.right.end!);
                            const propName = node.left.property.name;
                            codes.push({
                                prperty_name: propName,
                                right_func: code,
                            });
                        }
                        //module.exports.light = lib.findFiles();とマッチ
                        if(
                            t.isCallExpression(node.right) &&
                            t.isMemberExpression(node.right.callee) &&
                            t.isIdentifier(node.right.callee.object, { name: funcName })
                        ) {
                            const code: string = fileContent.substring(path.node.right.start!, path.node.right.end!);
                            const propName = node.left.property.name;
                            codes.push({
                                prperty_name: propName,
                                right_func: code,
                            });
                        }

                        //右辺が Identifier の場合：module.exports.hasMagic = someFunc;
                        if(t.isIdentifier(node.right) && node.right.name === funcName) {
                            const code: string = fileContent.substring(path.node.right.start!, path.node.right.end!);
                            const propName = node.left.property.name;
                            codes.push({
                                prperty_name: propName,
                                right_func: code,
                            });
                        }

                        // // 右辺がExpression：module.exports.hasMagic = function funcName() { ... };
                        // if(
                        //     t.isFunctionExpression(node.right) &&
                        //     node.right.id &&
                        //     node.right.id.name === funcName
                        // ) {
                        //     const code: string = fileContent.substring(path.node.right.start!, path.node.right.end!);
                        //     const propName = node.left.property.name;
                        //     codes.push({
                        //         prperty_name: propName,
                        //         right_func: code,
                        //     });
                        // }
                    }
                },
            });
        }

        if(codes.length > 0) {
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`getExceptionModule: Failed to create AST for file: ${filePath}`);
        console.log(error);
    }

    return resultArray;
};