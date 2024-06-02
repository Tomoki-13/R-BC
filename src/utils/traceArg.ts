import traverse from "@babel/traverse"; 
import * as t from "@babel/types";
//追跡
export const traceArg = (parsed: any, variableName: string, fileContent: string,nodestart:number): string => {
    let str: string = '';
    
    traverse(parsed, {
        VariableDeclarator(path) {
            const node = path.node;
    
            if (t.isIdentifier(node.id) && node.id.name === variableName && node.init) {
                const start = node.init.start;
                const end = node.init.end;
                //end < nodestart　変数定義は使用箇所より前にある
                if (typeof start === 'number' && typeof end === 'number' && end < nodestart) {
                    str = fileContent.substring(start, end);
                }
            }
        }
    });
    if (str !== '') {
        return str;
    }
    return variableName;
};