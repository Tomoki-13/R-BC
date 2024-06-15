const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { FunctionInfo, ExportFunctionInfo} from '../types/FunctionInfo';
export const analyzeExpression = async(filePath:string,libfuncName:string): Promise<FunctionInfo[]> => {
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
        
            traverse(parsed, {
                ExpressionStatement(path){
                    if (t.isCallExpression(path.node.expression)) {
                        const callee = path.node.expression.callee;
                        if (t.isIdentifier(callee)) {
                            const funcName: string = callee.name;
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
                            const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                            exportedFunctions.add(serializedFunc);
                        }
                    }
                },
                ExportNamedDeclaration(path) {
                    if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                        const funcName: string = path.node.declaration.id.name;
                        const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        exportedFunctions.add(serializeFunction(funcName, params));
                    } else if (t.isVariableDeclaration(path.node.declaration)) {
                        const declarations = path.node.declaration.declarations;
                        for (const declarator of declarations) {
                            if (t.isVariableDeclarator(declarator) && t.isIdentifier(declarator.id) && declarator.init && t.isArrowFunctionExpression(declarator.init)) {
                                const funcName = declarator.id.name;
                                const params = declarator.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                                const serializedFunc = serializeFunction(funcName, params);
                                exportedFunctions.add(serializedFunc);
                            }
                        }
                    }
                },
                ExportDefaultDeclaration(path){
                    if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                        const funcName: string = path.node.declaration.id.name;
                        const params: string[] = path.node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        exportedFunctions.add(serializeFunction(funcName, params));
                    } else if (t.isFunctionExpression(path.node.declaration) || t.isArrowFunctionExpression(path.node.declaration)) {
                        exportedFunctions.add({ name: 'default', args: [''] });
                    }
                },
                FunctionDeclaration(path){
                    if (path.node.id) {
                        const funcName: string = path.node.id.name;
                        const params: string[] = path.node.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                        resultArray.push({ name: funcName, args: params, isExported: isExportedFunction(serializedFunc) });
                    }
                },
                VariableDeclarator(path){
                    if (t.isIdentifier(path.node.id) && path.node.init && (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))) {
                        const funcName: string = path.node.id.name;
                        const params: string[] = path.node.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                        resultArray.push({ name: funcName, args: params, isExported: isExportedFunction(serializedFunc) });
                    }
                },
                AssignmentExpression(path){
                    if (t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
                        let funcName: string | undefined;
                        let params: string[] = path.node.right.params.map(param => (t.isIdentifier(param) ? param.name : ''));
        
                        if (t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
                            funcName = path.node.left.property.name;
                            if (t.isIdentifier(path.node.left.object) && (path.node.left.object.name === 'exports' || path.node.left.object.name === 'module')) {
                                exportedFunctions.add(serializeFunction(funcName, params));
                            }
                        } else if (t.isIdentifier(path.node.left)) {
                            funcName = path.node.left.name;
                        }
                        
                        if (funcName) {
                            const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                            resultArray.push({ name: funcName, args: params, isExported: isExportedFunction(serializedFunc) });
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
                                const funcName: string = specifier.exported.name;
                                for (const obj of resultArray) {
                                    if (obj.name.includes(funcName)) {
                                        obj.isExported = true;
                                    }
                                }
                            }
                        }
                    }
                },
                ExportDefaultDeclaration(path){
                    if (t.isIdentifier(path.node.declaration) && path.node.declaration.loc?.identifierName) {
                        const funcName: string = path.node.declaration.loc?.identifierName;
                        for (const obj of resultArray) {
                            if (obj.name.includes(funcName)) {
                                obj.isExported = true;
                            }
                        }
                    }
                },
            });
        }
    } catch (error) {
        console.log(`Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}