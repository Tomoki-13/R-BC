import * as parser from "@babel/parser";
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse"; 
import * as t from "@babel/types";
//引数追跡　１段階
export const getArgAst = async(filePath:string,funcName:string): Promise<string[][]> => {
    let resultArray:string[][]=[];
    try {
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', plugins: ["typescript",'decorators-legacy']});
            traverse(parsed, {
                CallExpression(path: any) {
                    const node = path.node;
                    let codes: string[] = [];
                    if (t.isIdentifier(node.callee) && node.callee.name.includes(funcName)) {
                        if (node.arguments.length > 0) {
                            const code = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                            codes.push(code);
                        }
                    } else if (t.isMemberExpression(node.callee)) {
                        if (t.isIdentifier(node.callee.object) && node.callee.object.name.includes(funcName)) {
                            if (node.arguments.length > 0) {
                                const code = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                                codes.push(code);
                            }
                        } else if (t.isMemberExpression(node.callee)) {
                            if (t.isIdentifier(node.callee.object.object) && node.callee.object.object.name.includes(funcName)) {
                                if (node.arguments.length > 0) {
                                    const code = fileContent.substring(node.arguments[0].start, node.arguments[node.arguments.length - 1].end);
                                    codes.push(code);
                                }
                            }
                        }
                    }
                    if(codes.length > 0){
                        resultArray.push(codes);
                        codes = [];
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

