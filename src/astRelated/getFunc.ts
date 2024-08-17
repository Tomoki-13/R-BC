const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { FunctionInfo, ExportFunctionInfo} from '../types/FunctionInfo';
//コード内の機能取得　user定義関数系
export const getFunc = async(filePath:string,funcName:string): Promise<FunctionInfo[]> => {
    let resultArray: FunctionInfo[] = [];
    try {
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', plugins: ["typescript",'decorators-legacy']});
        
            let exportedFunctions = new Set<ExportFunctionInfo>();
            const isExportedFunction = (func: ExportFunctionInfo): boolean => {
                for (const exportedFunc of exportedFunctions) {
                    if (exportedFunc.name === func.name && exportedFunc.args.join(',') === func.args.join(',')) {
                        return true;
                    }
                }
                return false;
            };
            
            const serializeFunction = (name: string, args: string[]): ExportFunctionInfo => {
                return { name, args };
            };
            const checkRange = (location: number[][], start: number, end: number): boolean => {
                try {
                    let isContained = false;
                    //locationの各要素についてループする
                    for (const [locStart, locEnd] of location) {
                        if (start <= locStart && end >= locEnd) {
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
            //位置の追跡
            const location: number[][] = await funcLocation(parsed, funcName);
            if(location.length>0){
                traverse(parsed, {
                    ExpressionStatement(path){
                        if (t.isCallExpression(path.node.expression)) {
                            const callee = path.node.expression.callee;
                            if (t.isIdentifier(callee)) {
                                const name: string = callee.name;
                                const params: string[] = path.node.expression.arguments.map(arg => {
                                    if (t.isIdentifier(arg)) {
                                        return arg.name;
                                    } else if (t.isLiteral(arg)) {
                                        const literal = arg as t.StringLiteral | t.NumericLiteral | t.BooleanLiteral;
                                        return String(literal.value);
                                    } else {
                                        return '';
                                    }
                                });
                                const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                                exportedFunctions.add(serializedFunc);
                            }
                        }
                    },
                    ExportNamedDeclaration(path) {
                        if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                            const name: string = path.node.declaration.id.name;
                            const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            exportedFunctions.add(serializeFunction(name, params));
                        } else if (t.isVariableDeclaration(path.node.declaration)) {
                            const declarations = path.node.declaration.declarations;
                            for (const declarator of declarations) {
                                if (t.isVariableDeclarator(declarator) && t.isIdentifier(declarator.id) && declarator.init && t.isArrowFunctionExpression(declarator.init)) {
                                    const name = declarator.id.name;
                                    const params = declarator.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                                    const serializedFunc = serializeFunction(name, params);
                                    exportedFunctions.add(serializedFunc);
                                }
                            }
                        }
                    },
                    ExportDefaultDeclaration(path){
                        if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                            const name: string = path.node.declaration.id.name;
                            const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            exportedFunctions.add(serializeFunction(name, params));
                        } else if (t.isFunctionExpression(path.node.declaration) || t.isArrowFunctionExpression(path.node.declaration)) {
                            exportedFunctions.add({ name: 'default', args: [''] });
                        }
                    },
                    FunctionDeclaration(path){
                        if (path.node.id &&checkRange(location, path.node?.start ?? 0, path.node.end ?? 0)) {
                            const name: string = path.node.id.name;
                            const params: string[] = path.node.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                            resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc) , start: path.node.start ?? 0, end: path.node.end ?? 0 });
                        }
                    },
                    VariableDeclarator(path){
                        if (t.isIdentifier(path.node.id) && path.node.init && (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))&& checkRange(location, path.node?.start ?? 0, path.node.end ?? 0)) {
                            const name: string = path.node.id.name;
                            const params: string[] = path.node.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                            const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                            resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc), start: path.node.start ?? 0, end: path.node.end ?? 0 });
                        }
                    },
                    AssignmentExpression(path){
                        if (t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
                            let name: string | undefined;
                            let params: string[] = path.node.right.params.map(param => (t.isIdentifier(param) ? param.name : ''));
            
                            if (t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
                                name = path.node.left.property.name;
                                if (t.isIdentifier(path.node.left.object) && (path.node.left.object.name === 'exports' || path.node.left.object.name === 'module')) {
                                    exportedFunctions.add(serializeFunction(name, params));
                                }
                            } else if (t.isIdentifier(path.node.left)) {
                                name = path.node.left.name;
                            }
                            
                            if (name&&checkRange(location, path.node?.start ?? 0, path.node.end ?? 0)) {
                                const serializedFunc: ExportFunctionInfo = serializeFunction(name, params);
                                resultArray.push({ name: name, args: params, isExported: isExportedFunction(serializedFunc), start: path.node.start ?? 0, end: path.node.end ?? 0 });
                            }
                        }
                    },
                });
        
                //他のエクスポートに対応
                traverse(parsed, {
                    ExportNamedDeclaration(path) {
                        if (path.node.specifiers.length > 0) {
                            for (const specifier of path.node.specifiers) {
                                if (t.isIdentifier(specifier.exported)) {
                                    const name: string = specifier.exported.name;
                                    for (const obj of resultArray) {
                                        if (obj.name.includes(name)) {
                                            obj.isExported = true;
                                        }
                                    }
                                }
                            }
                        }
                    },
                    ExportDefaultDeclaration(path){
                        if (t.isIdentifier(path.node.declaration) && path.node.declaration.loc?.identifierName) {
                            const name: string = path.node.declaration.loc?.identifierName;
                            for (const obj of resultArray) {
                                if (obj.name.includes(name)) {
                                    obj.isExported = true;
                                }
                            }
                        }
                    },
                });
            }
        }
    } catch (error) {
        console.log(`getFunc Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}

const funcLocation = async (parsed:any, funcName: string): Promise<number[][]> => {
    let resultArray: number[][] = [];
    try {
        traverse(parsed, {
            VariableDeclarator(path: any) {
                const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                if (t.isIdentifier(path.node.init?.callee) && path.node.init.callee.name === '_interopRequireDefault') {
                    const init = path.node.init;
                    if (init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && arg.name.includes(funcName))) {
                        resultArray.push([declarationNode.node.start, declarationNode.node.end]);
                    }
                } else if (t.isMemberExpression(path.node.init) && path.node.init.property.name === 'default') {
                    //.default対応
                    resultArray.push([declarationNode.node.start, declarationNode.node.end]);
                }
            },
            CallExpression(path: any) {
                if (t.isIdentifier(path.node.callee)) {
                    if (path.node.callee.name.includes(funcName)) {
                        resultArray.push([path.node.start, path.node.end]);
                    }
                } else if (t.isMemberExpression(path.node.callee)) {
                    if (t.isIdentifier(path.node.callee.object) && path.node.callee.object.name.includes(funcName)) {
                        resultArray.push([path.node.start, path.node.end]);
                    } else if (path.node.callee.object && t.isMemberExpression(path.node.callee.object)) {
                        //~~.default.~~()の取得
                        if (path.node.callee.object.object && t.isIdentifier(path.node.callee.object.object) && path.node.callee.object.object.name.includes(funcName)) {
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
