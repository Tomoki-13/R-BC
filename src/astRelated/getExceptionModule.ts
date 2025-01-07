//少し特殊な実装方法を取得するための機能
const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
import traverse from "@babel/traverse";
import * as t from "@babel/types";
export const getExceptionModule = async (filePath: string, funcName: string,code:string[]): Promise<string[]> => {
    let resultArray: string[] = [];
    try {
        let codes: string[] = [];
        //ファイルの内容を取得
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', plugins: ["typescript", 'decorators-legacy'] });
            //module.exports.propertyでの種類
            //module.exports.hasMagic
            traverse(parsed, {
                AssignmentExpression(path: any) {
                    if(t.isMemberExpression(path.node.left) &&
                    t.isMemberExpression(path.node.left.object) &&
                    t.isIdentifier(path.node.left.object.object) && path.node.left.object.object.name === "module" &&
                    t.isIdentifier(path.node.left.object.property) && path.node.left.object.property.name === "exports" && 
                    t.isIdentifier(path.node.left.property)){
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
            resultArray = resultArray.concat(codes);
        }
    } catch (error) {
        console.log(`getExceptionModule: Failed to create AST for file: ${filePath}`);
        console.log(error);
    }
    return resultArray;
}
