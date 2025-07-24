const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { FunctionInfo, ExportFunctionInfo} from '../types/FunctionInfo';
import { createAstFromFile } from './createAstFromFile';
//特定の関数が使われているuser定義関数系列を取得 調整必要
export const getFunc = async(filePath:string,funcName:string): Promise<FunctionInfo[]> => {
    //例外処理
    if(funcName.length === 0) {
        console.log('funcName is empty');
        return [];
    }
    let resultArray: FunctionInfo[] = [];
    try {
        //ファイルの内容を取得
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = createAstFromFile(filePath,fileContent);
            if(parsed === null){
                return [];
            }
            let exportedFuncList = new Set<ExportFunctionInfo>();
            //位置の追跡
            const location: number[][] = await funcLocation(parsed, funcName);
            console.log(location);
            location.forEach(element => {
                    console.log(fileContent.slice(element[0], element[1]));
            });
            if(location.length>0){
                //exportedFuncListにexport関数を登録
                traverse(parsed, {
                    ExpressionStatement(path){
                        if(t.isCallExpression(path.node.expression)) {
                            const callee = path.node.expression.callee;
                            if(t.isIdentifier(callee)) {
                                const name: string = callee.name;
                                const params: string[] = path.node.expression.arguments.map(arg => {
                                    if(t.isIdentifier(arg)) {
                                        return arg.name;
                                    } else if(t.isLiteral(arg)) {
                                        const literal = arg as t.StringLiteral | t.NumericLiteral | t.BooleanLiteral;
                                        return String(literal.value);
                                    } else {
                                        return '';
                                    }
                                });
                                const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                                exportedFuncList.add(serializedFunc);
                            }
                        }
                    },
                    ExportNamedDeclaration(path) {
                        if(t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                            const name: string = path.node.declaration.id.name;
                            const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            exportedFuncList.add(serializeFunction(name, params));
                        } else if(t.isVariableDeclaration(path.node.declaration)) {
                            const declarations = path.node.declaration.declarations;
                            for(const declarator of declarations) {
                                if(t.isVariableDeclarator(declarator) && t.isIdentifier(declarator.id) && declarator.init && t.isArrowFunctionExpression(declarator.init)) {
                                    const name = declarator.id.name;
                                    const params = declarator.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                                    const serializedFunc = serializeFunction(name, params);
                                    exportedFuncList.add(serializedFunc);
                                }
                            }
                        }
                    },
                    //デフォルトエクスポートは，定義されたファイルがインポート時に無名関数(標準で呼び出される関数)になる(注意)
                    ExportDefaultDeclaration(path){
                        if(t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                            const name: string = path.node.declaration.id.name;
                            const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            exportedFuncList.add(serializeFunction(name, params));
                        } else if(t.isFunctionExpression(path.node.declaration) || t.isArrowFunctionExpression(path.node.declaration)) {
                            exportedFuncList.add({ name: 'default', args: [''] });
                        }
                    },
                    AssignmentExpression(path){
                        if(t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
                            let name: string | undefined;
                            let params: string[] = path.node.right.params.map(param => (t.isIdentifier(param) ? param.name : ''));
            
                            if(t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
                                name = path.node.left.property.name;
                                if(t.isIdentifier(path.node.left.object) && (path.node.left.object.name === 'exports' || path.node.left.object.name === 'module')) {
                                    exportedFuncList.add(serializeFunction(name, params));
                                }
                            }
                        }
                    },
                });
                //user関数の取得とexoirtの判定
                traverse(parsed, {
                    FunctionDeclaration(path){
                        if(path.node.id) {
                            const name: string = path.node.id.name;
                            const params: string[] = path.node.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                            resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc,exportedFuncList) , start: path.node.start ?? 0, end: path.node.end ?? 0 });
                        }
                    },
                    VariableDeclarator(path){
                        if(t.isIdentifier(path.node.id) && path.node.init && (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))) {
                            const name: string = path.node.id.name;
                            const params: string[] = path.node.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                            resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc,exportedFuncList), start: path.node.start ?? 0, end: path.node.end ?? 0 });
                        }
                    },
                    AssignmentExpression(path){
                        if(t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
                            let name: string | undefined;
                            let params: string[] = path.node.right.params.map(param => (t.isIdentifier(param) ? param.name : ''));
            
                            if(t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
                                name = path.node.left.property.name;
                            } else if(t.isIdentifier(path.node.left)) {
                                name = path.node.left.name;
                            }
                            
                            if(name) {
                                const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                                resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc,exportedFuncList), start: path.node.start ?? 0, end: path.node.end ?? 0 });
                            }
                        }
                    },
                });
        
                //他のエクスポートに対応
                traverse(parsed, {
                    ExportNamedDeclaration(path) {
                        if(path.node.specifiers.length > 0) {
                            for(const specifier of path.node.specifiers) {
                                if(t.isIdentifier(specifier.exported)) {
                                    const name: string = specifier.exported.name;
                                    for(const obj of resultArray) {
                                        if(obj.name.includes(name)) {
                                            obj.isExported = true;
                                        }
                                    }
                                }
                            }
                        }
                    },
                    ExportDefaultDeclaration(path){
                        if(t.isIdentifier(path.node.declaration) && path.node.declaration.loc?.identifierName) {
                            const name: string = path.node.declaration.loc?.identifierName;
                            for(const obj of resultArray) {
                                if(obj.name.includes(name)) {
                                    obj.isExported = true;
                                }
                            }
                        }
                    },
                });
                //resultArray locationのスコープに注意　
                //関数を使用した部分を含むuser定義関数をフィルタリング
                resultArray = resultArray.filter(func => checkRange(location, func.start, func.end));
            }
        }
    } catch (error) {
        console.log(`getFunc Failed to create AST forfile: ${filePath}`);
        //console.log(error);
    }
    // console.log(resultArray.length);
    // resultArray.forEach(element => {
    //     console.log('============');
    //     console.log(element.name);
    //     console.log(element.args);
    //     console.log(element.isExported);
    //     console.log(element.start);
    //     console.log(element.end);
    //     console.log('============');
    // });
    return resultArray;
}
// console.log(getFunc('../__tests__/InputFile/functionSample/data1.js','add'));
// console.log(getFunc('../__tests__/InputFile/functionSample/getFunc/sample.ts',''));
//関数がエクスポートされた関数リストに存在するかを返す
const isExportedFunction = (func: ExportFunctionInfo,exportedFuncList: Set<ExportFunctionInfo>): boolean => {
    for(const exportedFunc of exportedFuncList) {
        if(exportedFunc.name === func.name && exportedFunc.args.join(',') === func.args.join(',')) {
            return true;
        }
    }
    return false;
};
//関数名と引数のリストを受け取り,ExportFunctionInfo型のオブジェクトを返す
const serializeFunction = (name: string, args: string[]): ExportFunctionInfo => {
    return { name, args };
};
//startとendがlocationの範囲内にあるかどうかを返す(funcNameの関数を利用)
const checkRange = (location: number[][], start: number, end: number): boolean => {
    try {
        let isContained = false;
        //locationの各要素についてループする
        for(const [locStart, locEnd] of location) {
            if(start <= locStart && end >= locEnd) {
                isContained = true;
                break;
            }
        }
        return isContained;
    } catch (error) {
        console.error('Error checkRange:', error);
        return false;
    }
};

//関数(funcName)が定義された全部の位置を取得 [[0,20],[30,50]]
const funcLocation = async (parsed:any, funcName: string): Promise<number[][]> => {
    let resultArray: number[][] = [];
    try {
        traverse(parsed, {
            VariableDeclarator(path: any) {
                const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                if(t.isIdentifier(path.node.init?.callee) && path.node.init.callee.name === '_interopRequireDefault') {
                    const init = path.node.init;
                    if(init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && arg.name.includes(funcName))) {
                        resultArray.push([declarationNode.node.start, declarationNode.node.end]);
                    }
                } else if(t.isMemberExpression(path.node.init) && path.node.init.name === funcName && path.node.init.property.name === 'default') {
                    //funcName.default対応
                    resultArray.push([declarationNode.node.start, declarationNode.node.end]);
                }
            },
            CallExpression(path: any) {
                if(t.isIdentifier(path.node.callee)) {
                    if(path.node.callee.name.includes(funcName)) {
                        resultArray.push([path.node.start, path.node.end]);
                    }
                } else if(t.isMemberExpression(path.node.callee)) {
                    if(t.isIdentifier(path.node.callee.object) && path.node.callee.object.name.includes(funcName)) {
                        resultArray.push([path.node.start, path.node.end]);
                    } else if(path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                        //~~.default.~~()の取得
                        if(path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object) && path.node.callee.object.object.name.includes(funcName)) {
                            resultArray.push([path.node.start, path.node.end]);
                        }
                    }
                }
            },
        });
    } catch (error) {
        console.log(error);
    }
    return resultArray;
}
