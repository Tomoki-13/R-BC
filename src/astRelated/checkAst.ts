const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';

export const checkAst = async(filePath:string): Promise<boolean> => {
    try {
        if(filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
            const parsed = parser.parse(fileContent, {sourceType: 'unambiguous', 
                plugins: [
                    'typescript',                // TS構文
                    'jsx',                       // JSX（React）
                    'decorators-legacy',         // デコレーター
                    'classProperties',           // クラスのプロパティ
                    'classPrivateProperties',    // #プライベートフィールド
                    'classPrivateMethods',       // #プライベートメソッド
                    'optionalChaining',          // ?.演算子
                    'nullishCoalescingOperator'  // ??演算子
                ]});
            if(parsed){
                return true;
            }
        }
    } catch (error) {
        // console.log(`AST creation not possible: ${filePath}`);
        // console.log(error);
        return false;
    }
    return false;
}

