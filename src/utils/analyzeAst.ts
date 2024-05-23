const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import { funcNameIdentifiers } from "./funcNameIdentifiers";
import * as t from "@babel/types";

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
