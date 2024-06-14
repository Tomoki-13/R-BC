const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import { funcNameIdentifiers } from "./funcNameIdentifiers";
import * as t from "@babel/types";
import { traceArg } from "./traceArg";
import { FunctionInfo, ExportFunctionInfo} from '../types/FunctionInfo';
export const analyzeAst = async(filePath:string,funcName:string): Promise<string[]> => {
    let resultArray:string[]=[];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', plugins: ["typescript",'decorators-legacy']});
            //const parsed = parser.parse(fileContent, { ecmaVersion: 2020, sourceType: 'script', plugins: ["typescript"] });
            traverse(parsed, {
                VariableDeclarator(path:any) {
                    const node = path.node;
                    const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                    if(t.isIdentifier(node.init?.callee) && node.init.callee.name === '_interopRequireDefault'){
                        const init = node.init;
                        if(init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && arg.name.includes(funcName))){
                            const code:string = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                            codes.push(code);
                        }
                    }else if (t.isMemberExpression(node.init) && node.init.property.name === 'default') {
                        //.default対応
                        const code = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                        codes.push(code);
                    }
                },
                CallExpression(path: any) {
                    const node = path.node;
                    //関数の呼び出しを見つける
                    if (node.callee.type === 'Identifier') {
                        if(node.callee.name.includes(funcName)){
                            const code: string = fileContent.substring(node.start, node.end);
                            codes.push(code);
                        }
                    } else if (node.callee.type === 'MemberExpression') {
                        if (node.callee.object?.type === 'Identifier' && node.callee.object.name.includes(funcName)) {
                            const code: string = fileContent.substring(node.start, node.end);
                            //mockを行で削除
                            // if(!code.includes('mockImplementation')){
                            //     codes.push(code);
                            // }
                            codes.push(code);
                        } else if (node.callee.object && node.callee.object.type === 'MemberExpression'){
                            //~~.default.~~()の取得
                            if(node.callee.object.object && node.callee.object.object.type === 'Identifier'){
                                if(node.callee.object.object.name.includes(funcName)) {
                                    const code: string = fileContent.substring(node.start, node.end);
                                    codes.push(code);
                                }
                            }
                        }
                    }
                },
            });
        }
        if(codes.length > 0){
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}
//機能名を返す
export const analyzeAstFuncName = async(filePath:string,libName:string): Promise<string[]> => {
    let resultArray:string[]=[];
        try {
            let codes: string[] = [];
            //ファイル指定とast処理
            if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
                const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
                const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', plugins: ["typescript",'decorators-legacy'] });
                traverse(parsed, {
                    ImportDeclaration(path: any) {
                        const node = path.node;
                        for (const specifier of node.specifiers) {
                            if (specifier.local.type === 'Identifier' && specifier.local.name.includes(libName)) {
                                const code:string = fileContent.substring(node.start, node.end);
                                codes.push(code);
                            }
                        }
                    },
                    VariableDeclaration(path: any) {
                        const node = path.node;
                        for (const declaration of node.declarations) {
                            if (declaration.id.type === 'Identifier' && declaration.id.name.includes(libName)) {
                                const code = fileContent.substring(node.start, node.end);
                                codes.push(code);
                            }
                        }
                    }
                });
            }
            if(codes.length > 0){
                //codesはおそらく要素が１つになるので，stringでも良さそう
                //console.log('code', codes);
                resultArray = resultArray.concat(...codes.map(code => funcNameIdentifiers(code, libName)).filter(funcName => funcName.length > 0));
            }
        } catch (error) {
            console.log(`Failed to create AST for file: ${filePath}`);
            //console.log('error', error);
        }
    return resultArray;
}

//置き換え処理追加後
export const argplace = async(filePath:string,funcName:string): Promise<string[]> => {
    let resultArray:string[]=[];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', plugins: ["typescript",'decorators-legacy']});
            //const parsed = parser.parse(fileContent, { ecmaVersion: 2020, sourceType: 'script', plugins: ["typescript"] });
            traverse(parsed, {
                VariableDeclarator(path:any) {
                    const node = path.node;
                    const declarationNode = path.findParent((p: any) => t.isVariableDeclaration(p.node));
                    if(t.isIdentifier(node.init?.callee) && node.init.callee.name === '_interopRequireDefault'){
                        const init = node.init;
                        if(init.arguments && init.arguments.some((arg: t.Expression | t.Identifier) => t.isIdentifier(arg) && arg.name.includes(funcName))){
                            const code:string = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                            codes.push(code);
                        }
                    }else if (t.isMemberExpression(node.init) && node.init.property.name === 'default') {
                        //.default対応
                        const code = fileContent.substring(declarationNode.node.start, declarationNode.node.end);
                        codes.push(code);
                    }
                },
                CallExpression(path: any) {
                    const node = path.node;
                    // 関数の呼び出しを見つける
                    if (node.callee.type === 'Identifier' && node.callee.name.includes(funcName)) {
                        let code = fileContent.substring(node.start, node.end);
                        if (node.arguments.length > 0) {
                            //~~()の部分
                            let placeword:string = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                            //置き換え先
                            let toplaceword:string = placeword;
                            for(let i = 0;i < node.arguments.length - 1;i++){
                                const variableName:string = fileContent.substring(node.arguments[i].start, node.arguments[i].end);
                                //a to name
                                let toword:string = traceArg(parsed,variableName,fileContent,node.arguments[i].start);
                                if(toword.length>0){
                                    //置き換え
                                    toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                }
                            }
                            if(placeword != toplaceword){
                                code = code.replace(new RegExp(placeword), toplaceword);
                            }
                        }
                        codes.push(code);
                    } else if (node.callee.type === 'MemberExpression') {
                        if (node.callee.object?.type === 'Identifier' && node.callee.object.name.includes(funcName)) {
                            let code = fileContent.substring(node.start, node.end);
                            if (node.arguments.length > 0) {
                                let placeword:string = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                                let toplaceword:string = placeword;
                                for(let i = 0;i < node.arguments.length - 1;i++){
                                    const variableName:string = fileContent.substring(node.arguments[i].start, node.arguments[i].end);
                                    let toword:string = traceArg(parsed,variableName,fileContent,node.arguments[i].start);
                                    if(toword.length>0){
                                        toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                    }
                                }
                                if(placeword != toplaceword){
                                    code = code.replace(new RegExp(placeword), toplaceword);
                                }
                            }
                            codes.push(code);
                        } else if (node.callee.object && node.callee.object.type === 'MemberExpression') {
                            // ~~.default.~~()の取得
                            if (node.callee.object.object && node.callee.object.object.type === 'Identifier') {
                                if (node.callee.object.object.name.includes(funcName)) {
                                    let code = fileContent.substring(node.start, node.end);
                                    if (node.arguments.length > 0) {
                                        let placeword:string = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                                        let toplaceword:string = placeword;
                                        for(let i = 0;i < node.arguments.length - 1;i++){
                                            const variableName:string = fileContent.substring(node.arguments[i].start, node.arguments[i].end);
                                            let toword:string = traceArg(parsed,variableName,fileContent,node.arguments[i].start);
                                            if(toword.length>0){
                                                toplaceword = toplaceword.replace(new RegExp(variableName), toword);
                                            }
                                        }
                                        if(placeword != toplaceword){
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
        if(codes.length > 0){
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`Failed to create AST for file: ${filePath}`);
        //console.log(error);
    }
    return resultArray;
}

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
                    const node = path.node;
                    if (t.isCallExpression(node.expression)) {
                        const callee = node.expression.callee;
                        if (t.isIdentifier(callee)) {
                            const funcName: string = callee.name;
                            const args: string[] = node.expression.arguments.map(arg => {
                                if (t.isIdentifier(arg)) {
                                    return arg.name;
                                } else if (t.isLiteral(arg)) {
                                    const literal = arg as t.StringLiteral | t.NumericLiteral | t.BooleanLiteral;
                                    return String(literal.value);
                                } else {
                                    return '';
                                }
                            });
                            const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, args);
                            exportedFunctions.add(serializedFunc);
                        }
                    }
                },
                ExportNamedDeclaration(path) {
                    const node = path.node;
                    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
                        const funcName: string = node.declaration.id.name;
                        const params: string[] = node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        exportedFunctions.add(serializeFunction(funcName, params));
                    } else if (t.isVariableDeclaration(node.declaration)) {
                        const declarations = node.declaration.declarations;
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
                    const node = path.node;
                    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
                        const funcName: string = node.declaration.id.name;
                        const params: string[] = node.declaration.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        exportedFunctions.add(serializeFunction(funcName, params));
                    } else if (t.isFunctionExpression(node.declaration) || t.isArrowFunctionExpression(node.declaration)) {
                        exportedFunctions.add({ name: 'default', args: [''] });
                    }
                },
                FunctionDeclaration(path){
                    const node = path.node;
                    if (node.id) {
                        const funcName: string = node.id.name;
                        const params: string[] = node.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                        resultArray.push({ name: funcName, args: params, isExported: isExportedFunction(serializedFunc) });
                    }
                },
                VariableDeclarator(path){
                    const node = path.node;
                    if (t.isIdentifier(node.id) && node.init && (t.isFunctionExpression(node.init) || t.isArrowFunctionExpression(node.init))) {
                        const funcName: string = node.id.name;
                        const params: string[] = node.init.params.map(param => (t.isIdentifier(param) ? param.name : ''));
                        const serializedFunc: ExportFunctionInfo = serializeFunction(funcName, params);
                        resultArray.push({ name: funcName, args: params, isExported: isExportedFunction(serializedFunc) });
                    }
                },
                AssignmentExpression(path){
                    const node = path.node;
                    if (t.isFunctionExpression(node.right) || t.isArrowFunctionExpression(node.right)) {
                        let funcName: string | undefined;
                        let params: string[] = node.right.params.map(param => (t.isIdentifier(param) ? param.name : ''));
        
                        if (t.isMemberExpression(node.left) && !node.left.computed && t.isIdentifier(node.left.property)) {
                            funcName = node.left.property.name;
                            if (t.isIdentifier(node.left.object) && (node.left.object.name === 'exports' || node.left.object.name === 'module')) {
                                exportedFunctions.add(serializeFunction(funcName, params));
                            }
                        } else if (t.isIdentifier(node.left)) {
                            funcName = node.left.name;
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
                    const node = path.node;
                    if (node.specifiers.length>0){
                        for(const specifier of node.specifiers){
                            if(t.isIdentifier(specifier.exported)){
                                const funcname:string = specifier.exported.name;
                                for (const obj of resultArray) {
                                    if (obj.name.includes(funcname)) {
                                        obj.isExported = true;
                                    }
                                }
                            }
                        }
                    }
                },
                ExportDefaultDeclaration(path){
                    const node = path.node;
                    if (t.isIdentifier(node.declaration) && node.declaration.loc?.identifierName) {
                        const funcname:string = node.declaration.loc?.identifierName;
                        for (const obj of resultArray) {
                            if (obj.name.includes(funcname)) {
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