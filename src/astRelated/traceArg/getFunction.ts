import { promises as fs } from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

import { FunctionMetaInfo, FunctionInfo_funcRange } from '../../types/FunctionMetaInfo';

//mode = 0:exportされている関数のみを抽出，,mode = 1:全ての関数を抽出
// 関数の定義は、アロー関数から関数宣言まで対応
export const getFunc = async (filePath: string, mode = 0): Promise<FunctionInfo_funcRange[]> => {
  const resultArray: FunctionMetaInfo[] = [];

  try {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      const fileContent: string = await fs.readFile(filePath, 'utf8');
      const parsed = parser.parse(fileContent, {
        sourceType: 'unambiguous',
        plugins: ['typescript', 'decorators-legacy'],
      });

      const exportedFunctions = new Set<{ name: string; args: string[] }>();

      const isExportedFunction = (func: { name: string; args: string[] }): boolean => {
        for (const exportedFunc of exportedFunctions) {
          if (exportedFunc.name === func.name && exportedFunc.args.join(',') === func.args.join(',')) {
            return true;
          }
        }
        return false;
      };

      const serializeFunction = (name: string, args: string[]): { name: string; args: string[] } => {
        return { name, args };
      };

      traverse(parsed, {
        FunctionDeclaration(path) {
          if (path.node.id) {
            const name: string = path.node.id.name;
            const params = path.node.params.map((param) => (t.isIdentifier(param) ? param.name : ''));
            const serializedFunc = serializeFunction(name, params);

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: isExportedFunction(serializedFunc),
                arg: params,
                filePath,
                start: path.node.start,
                end: path.node.end,
              });
            }
          }
        },

        ExportNamedDeclaration(path) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            const name: string = path.node.declaration.id.name;
            const params = path.node.declaration.params.map((param) => (t.isIdentifier(param) ? param.name : ''));
            exportedFunctions.add(serializeFunction(name, params));

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: true,
                arg: params,
                filePath,
                start: path.node.declaration.start,
                end: path.node.declaration.end,
              });
            }
          } else if (t.isVariableDeclaration(path.node.declaration)) {
            for (const declarator of path.node.declaration.declarations) {
              if (
                t.isVariableDeclarator(declarator) &&
                t.isIdentifier(declarator.id) &&
                declarator.init &&
                (t.isFunctionExpression(declarator.init) || t.isArrowFunctionExpression(declarator.init))
              ) {
                const name: string = declarator.id.name;
                const params = declarator.init.params.map((param) => (t.isIdentifier(param) ? param.name : ''));
                exportedFunctions.add(serializeFunction(name, params));

                if (!resultArray.some((func) => func.name === name)) {
                  resultArray.push({
                    name,
                    isExported: true,
                    arg: params,
                    filePath,
                    start: declarator.init.start,
                    end: declarator.init.end,
                  });
                }
              }
            }
          }
        },

        ExportDefaultDeclaration(path) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            const name: string = path.node.declaration.id.name;
            const params = path.node.declaration.params.map((param) => (t.isIdentifier(param) ? param.name : ''));
            exportedFunctions.add(serializeFunction(name, params));

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: true,
                arg: params,
                filePath,
                start: path.node.declaration.start,
                end: path.node.declaration.end,
              });
            }
          }
        },

        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id) && path.node.init && (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))) {
            const name: string = path.node.id.name;
            const params = path.node.init.params.map((param) => (t.isIdentifier(param) ? param.name : ''));
            const serializedFunc = serializeFunction(name, params);

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: isExportedFunction(serializedFunc),
                arg: params,
                filePath,
                start: path.node.init.start,
                end: path.node.init.end,
              });
            }
          }
        },

        AssignmentExpression(path) {
          if (t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
            let name: string | undefined;
            const params = path.node.right.params.map((param) => (t.isIdentifier(param) ? param.name : ''));

            if (t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
              name = path.node.left.property.name;
              if (t.isIdentifier(path.node.left.object) && (path.node.left.object.name === 'exports' || path.node.left.object.name === 'module')) {
                exportedFunctions.add(serializeFunction(name, params));
              }
            } else if (t.isIdentifier(path.node.left)) {
              name = path.node.left.name;
            }

            if (name) {
              const serializedFunc = serializeFunction(name, params);
              if (!resultArray.some((func) => func.name === name)) {
                resultArray.push({
                  name,
                  isExported: isExportedFunction(serializedFunc),
                  arg: params,
                  filePath,
                  start: path.node.right.start,
                  end: path.node.right.end,
                });
              }
            }
          }
        },
      });
    }
  } catch (error) {
    console.log(`getFunc Failed to create AST for file: ${filePath}. Error: ${error}`);
  }
  if (mode === 0) {
    const filteredResult: FunctionInfo_funcRange[] = toExportedFunctionInfo(resultArray);
    return filteredResult;
  } else if (mode === 1) {
    const filteredResult: FunctionInfo_funcRange[] = resultArray.map((func) => ({
      funcname: func.name,
      arg: func.arg,
      filePath: func.filePath,
      start: func.start,
      end: func.end,
    }));
    return filteredResult;
  } else {
    throw new Error('Invalid mode specified. Use 0 for exported functions only or 1 for all functions.');
  }

};

function toExportedFunctionInfo(data: FunctionMetaInfo[]): FunctionInfo_funcRange[] {
  const result = data
    .filter((func) => func.isExported) //外部にexportされている関数のみを抽出
    .map((func) => ({
      funcname: func.name,
      arg: func.arg,
      filePath: func.filePath,
      start: func.start,
      end: func.end,
    }));
  return result;
}