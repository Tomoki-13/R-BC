const parser = require("@babel/parser");
import { promises as fsPromises } from 'fs';
const traverse = require("@babel/traverse").default;

export const analyzetsAst = async(allFiles: string[],libName:string): Promise<string[]> => {
    let codes:string[]=[];
    try {
        let filePath:string = '/Users/tomoki-i/study/rbc/Sampleuuid/sample2/tssample1.ts';
        const fileContent:string = await fsPromises.readFile(filePath, 'utf8');
        const parsed = parser.parse(fileContent, { ecmaVersion: 2020 ,sourceType: 'module',plugins: ["typescript"] });
        //console.log(parsed);
        traverse( parsed, {
            ImportDeclaration(path:any) {
                const node = path.node;
                for (const specifier of node.specifiers) {
                    if (specifier.local.type === 'Identifier' && specifier.local.name.includes(libName)) {
                        const code = fileContent.substring(node.start, node.end);
                        codes.push(code);
                    }
                }
            },
            VariableDeclaration(path:any) {
                const node = path.node;
                for (const declaration of node.declarations) {
                    if (declaration.id.type === 'Identifier' && declaration.id.name.includes(libName)) {
                        const code = fileContent.substring(node.start, node.end);
                        codes.push(code);
                    }
                }
            },
            CallExpression(path:any) {
                const node = path.node;
                //関数の呼び出しを見つける
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
    } catch (err) {
        console.error("Error:", err);
    }
    return codes;
}