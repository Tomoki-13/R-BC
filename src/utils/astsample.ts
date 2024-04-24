import { promises as fsPromises } from 'fs';
import acorn from 'acorn';
import { simple } from 'acorn-walk';
// ファイルのパス

export const astsample = async(allFiles: string[],libName:string): Promise<string[]> => {
    let codes:string[] = [];
    try {
        for (const filePath of allFiles) {
            //別のファイルを読み込み、その内容を取得
            const fileContent:string = await fsPromises.readFile(filePath, 'utf8');
            //jsのみしか現在不可能
            //別のファイルのASTを生成
            console.log(filePath);
            const parsed = acorn.parse(fileContent, { ecmaVersion: 2020 ,sourceType: 'module'});

            //UUID関数を使用している箇所を探す
            //console.log(parsed);
            //simple(node, visitors, base, state)
            if(parsed){
                simple(parsed, {
                    VariableDeclaration(node) {
                        //関数の定義を見つける
                        for (const declaration of node.declarations) {
                            if (declaration.id.type === 'Identifier' && declaration.id.name.includes(libName)){
                                const code:string = fileContent.substring(node.start, node.end);
                                codes.push(code);
                            }
                        }
                    }//,
                    // CallExpression(node) {
                    //     // 関数の呼び出しを見つける
                    //     if (node.callee.type === 'Identifier' && node.callee.name === 'libName') {
                    //         // UUID関数の呼び出しを見つけたら、そのノードを文字列に変換して保存
                    //         console.log(node);
                    //         const code:string = fileContent.substring(node.start, node.end);
                    //         codes.push(code);
                    //     }
                    // }
                });
    
                //UUID関数を使用している箇所のコードを出力
                // for (const code of Codes) {
                //     console.log(code);
                // };
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
    return codes;
}