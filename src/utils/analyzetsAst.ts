
const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import { funcNameIdentifiers } from "./funcNameIdentifiers";

export const analyzetsAst = async(filePath:string,libName:string,funcName:string): Promise<string[][]> => {
    let resultArray:string[][]=[];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, { ecmaVersion: 2020, sourceType: 'script', plugins: ["typescript"] });
            //const parsed = parser.parse(fileContent, { ecmaVersion: 2020, sourceType: 'script', plugins: ["typescript"] });
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
                },
                CallExpression(path: any) {
                    const node = path.node;
                    //関数の呼び出しを見つける
                    if (node.callee.type === 'Identifier' && node.callee.name === funcName) {
                        //UUID関数の呼び出しを見つけたら、そのノードを文字列に変換して保存
                        const code: string = fileContent.substring(node.start, node.end);
                        codes.push(code);
                    } else if (node.callee.type === 'MemberExpression') {
                        if (node.callee.object && node.callee.object.type === 'Identifier' && node.callee.object.name === libName) {
                            const code: string = fileContent.substring(node.start, node.end);
                            codes.push(code);
                        }
                    }
                }
            });
        }
        // console.log('codes'+codes);
        // console.log('console.log(codes.length);'+codes.length);
        if(codes.length > 0){
            resultArray.push(codes);
        }
    } catch (error) {
        //console.log(`Failed to create AST for file: ${filePath}`);
    }
    return resultArray;
}
//機能名を返す
export const analyzetsAstFuncName = async(filePath:string,libName:string): Promise<string[]> => {
    let resultArray:string[]=[];
        try {
            let codes: string[] = [];
            //ファイル指定とast処理
            if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
                const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
                const parsed = parser.parse(fileContent, { ecmaVersion: 2020, sourceType: 'module', plugins: ["typescript"] });
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
                resultArray = resultArray.concat(...codes.map(code => funcNameIdentifiers(code, libName)).filter(funcName => funcName.length > 0));
            }
        } catch (error) {
            //console.log(`Failed to create AST for file: ${filePath}`);
            //console.log('error', error);
        }
    return resultArray;
}