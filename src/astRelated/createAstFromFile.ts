import * as parser from '@babel/parser';
import { File } from '@babel/types';

export const createAstFromFile = (filePath: string, fileContent: string): File | null => {
    try{
        const plugins: parser.ParserPlugin[] = [
            'typescript',                // TypeScript構文
            'decorators-legacy',         // デコレーター
            'classProperties',           // クラスのプロパティ
            'classPrivateProperties',    // #プライベートフィールド
            'classPrivateMethods',       // #プライベートメソッド
            'optionalChaining',          // ?.演算子
            'nullishCoalescingOperator', // ??演算子
        ];

        // JSX対応（TSXやJSXが含まれる場合）
        if(filePath.endsWith('.tsx') || filePath.endsWith('.jsx') || /<[A-Za-z]/.test(fileContent)) {
            plugins.push('jsx');
        }

        // Babel Parserでパース
        const ast = parser.parse(fileContent, {
            sourceType: 'unambiguous',
            plugins,
            errorRecovery: true,
        });

        return ast; // ASTを返す
    } catch (error) {
        // console.error(`AST creation not possible: ${filePath}`);
        // console.error(error);
        return null;
    }
};