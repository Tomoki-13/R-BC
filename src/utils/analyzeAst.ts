import { promises as fsPromises } from 'fs';
import acorn from 'acorn';
import { simple } from 'acorn-walk';

export const analyzeAst = async(allFiles: string[],libName:string): Promise<string[]> => {
    let codes:string[] = [];
    try {
        for (const filePath of allFiles) {
            //ファイルの内容を取得
            const fileContent:string = await fsPromises.readFile(filePath, 'utf8');
            //jsのみしか現在不可能
            //console.log(filePath);
            if(filePath.endsWith('.js')){
                //ファイルからASTを生成
                const parsed = acorn.parse(fileContent, { ecmaVersion: 2020 ,sourceType: 'module', locations: true })
                if(parsed){
                    simple(parsed, {
                        ImportDeclaration(node){
                            for (const specifier of node.specifiers) {
                                if (specifier.local.type === 'Identifier' && specifier.local.name.includes(libName)){
                                    const code:string = fileContent.substring(node.start, node.end);
                                    codes.push(code);
                                }
                            }
                        },
                        VariableDeclaration(node) {
                            //関数の定義を見つける
                            for (const declaration of node.declarations) {
                                if (declaration.id.type === 'Identifier' && declaration.id.name.includes(libName)){
                                    const code:string = fileContent.substring(node.start, node.end);
                                    codes.push(code);
                                }
                            }
                        },
                        CallExpression(node) {
                            // 関数の呼び出しを見つける
                            if (node.callee.type === 'Identifier' && node.callee.name === libName) {
                                //UUID関数の呼び出しを見つけたら、そのノードを文字列に変換して保存
                                const code:string = fileContent.substring(node.start, node.end);
                                codes.push(code);
                            }else if(node.callee.type === 'MemberExpression'){
                                if(node.callee.object && node.callee.object.type === 'Identifier' && node.callee.object.name === libName){
                                    const code:string = fileContent.substring(node.start, node.end);
                                    codes.push(code);
                                }
                            }
                        }
                    });
        
                    //UUID関数を使用している箇所のコードを出力
                    // for (const code of Codes) {
                    //     console.log(code);
                    // };
                }
            }else{
                console.log('tsファイル:'+filePath);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
    return codes;
}