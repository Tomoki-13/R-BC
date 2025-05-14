import traverse from "@babel/traverse"; 
import * as t from "@babel/types";
import generate from "@babel/generator"; 

/**
 * 指定した変数名の宣言・代入を、nodestart位置より前から探す
 */
export const traceArg = (
  parsed: t.File, 
  variableName: string, 
  fileContent: string,
  nodestart: number
): string[] => {
  const values: string[] = [];
  let latestEnd = -1;

  traverse(parsed, {
    VariableDeclarator(path) {
      const node = path.node;
      if (
        t.isIdentifier(node.id) &&
        node.id.name === variableName &&
        node.init &&
        typeof node.init.start === 'number' &&
        typeof node.init.end === 'number' &&
        node.init.end < nodestart
      ) {
        const initValue = fileContent.substring(node.init.start, node.init.end);
        values.push(initValue);
        console.log(`VariableDeclarator found: ${variableName} = ${initValue}`);
        if (node.init.end > latestEnd) {
          latestEnd = node.init.end;
        }
      }
    },
    AssignmentExpression(path) {
      const node = path.node;
      if (
        t.isIdentifier(node.left) &&
        node.left.name === variableName &&
        typeof node.right.start === 'number' &&
        typeof node.right.end === 'number' &&
        typeof node.end === 'number' &&
        node.end < nodestart
      ) {
        let rightHand = '';
        if (['+=', '-=', '*=', '/='].includes(node.operator)) {
          rightHand = `${variableName} ${node.operator[0]} ${fileContent.substring(node.right.start, node.right.end)}`;
        } else {
          rightHand = fileContent.substring(node.right.start, node.right.end);
        }
        values.push(rightHand);
        console.log(`Assignment found: ${variableName} = ${rightHand}`);
        if (node.end > latestEnd) {
          latestEnd = node.end;
        }
      }
    }
  });

  return values;
};