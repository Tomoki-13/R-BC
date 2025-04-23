import traverse from "@babel/traverse"; 
import * as t from "@babel/types";
import generate from "@babel/generator"; 
//追跡
export const traceArg = (parsed: any, variableName: string, fileContent: string,nodestart:number): string => {
    let str: string = '';
    let latestEnd = -1;
    const variableValues: Record<string, string> = {};


    traverse(parsed, {
        VariableDeclarator(path) {
            const node = path.node;
            if(
                t.isIdentifier(node.id) &&
                node.id.name === variableName &&
                node.init &&
                typeof node.init.start === 'number' &&
                typeof node.init.end === 'number' &&
                node.init.end < nodestart &&
                node.init.end > latestEnd
            ){
                str = fileContent.substring(node.init.start, node.init.end);
                latestEnd = node.init.end;
            }
        },
        AssignmentExpression(path) {
            const node = path.node;
            if(
                t.isIdentifier(node.left) &&
                node.left.name === variableName &&
                typeof node.right.start === 'number' &&
                typeof node.right.end === 'number' &&
                typeof node.end === 'number' && 
                node.end < nodestart &&
                node.end > latestEnd
            ){
                //右辺の処理
                if(['+=', '-=', '*=', '/='].includes(node.operator)) {
                    str = `${variableName} ${node.operator[0]} ${fileContent.substring(node.right.start, node.right.end)}`;
                }else{
                    str = fileContent.substring(node.right.start, node.right.end);
                }
                console.log(`Assignment found: ${variableName} = ${str}`);
                latestEnd = node.end;
            }
        }

    });
    if (str !== '') {
        return str;
    }
    return variableName;
};
