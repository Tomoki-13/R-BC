import { promises as fs } from 'fs';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

import { createAstFromFile } from '../createAstFromFile';
import { FunctionMetaInfo, FunctionInfo_funcRange } from '../../types/FunctionInfo';

// mode = 0:exportされている関数のみを抽出, mode = 1:全ての関数を抽出
export const getFunction = async (filePath: string, mode = 0): Promise<FunctionInfo_funcRange[]> => {
  const resultArray: FunctionMetaInfo[] = [];
  const explicitlyExportedNames = new Set<string>();

  try {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      const fileContent: string = await fs.readFile(filePath, 'utf8');

      // createAstFromFileを使用
      const parsed = createAstFromFile(filePath, fileContent);

      if (!parsed) {
        console.log(`getFunc Failed to create AST via helper for file: ${filePath}`);
        return [];
      }

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

      // パラメータ名を抽出するヘルパー
      const getParams = (params: any[]) => params.map((param) => (t.isIdentifier(param) ? param.name : ''));

      traverse(parsed, {
        // 関数宣言
        FunctionDeclaration(path) {
          if (path.node.id) {
            const name: string = path.node.id.name;
            const params = getParams(path.node.params);
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

        // 名前付きエクスポート
        ExportNamedDeclaration(path) {
          if (path.node.declaration) {
            if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
              const name: string = path.node.declaration.id.name;
              const params = getParams(path.node.declaration.params);
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
                  const params = getParams(declarator.init.params);
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
          }

          if (path.node.specifiers && path.node.specifiers.length > 0) {
            path.node.specifiers.forEach((spec) => {
              if (t.isExportSpecifier(spec) && t.isIdentifier(spec.local)) {
                explicitlyExportedNames.add(spec.local.name);
              }
            });
          }
        },

        // デフォルトエクスポート
        ExportDefaultDeclaration(path) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            const name: string = path.node.declaration.id.name;
            const params = getParams(path.node.declaration.params);
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
          } else if (t.isIdentifier(path.node.declaration)) {
            explicitlyExportedNames.add(path.node.declaration.name);
          }
        },

        // 変数宣言（アロー関数など）
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id) && path.node.init && (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))) {
            const name: string = path.node.id.name;
            const params = getParams(path.node.init.params);
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

        // CommonJS exports への代入 (module.exports.func = ... 対応)
        AssignmentExpression(path) {
          if (t.isFunctionExpression(path.node.right) || t.isArrowFunctionExpression(path.node.right)) {
            let name: string | undefined;
            const params = getParams(path.node.right.params);

            if (t.isMemberExpression(path.node.left) && !path.node.left.computed && t.isIdentifier(path.node.left.property)) {
              // exports.func = ...
              // module.exports.func = ...
              const object = path.node.left.object;
              const isExportsIdentifier = t.isIdentifier(object) && object.name === 'exports';
              const isModuleExports = t.isMemberExpression(object) &&
                t.isIdentifier(object.object) && object.object.name === 'module' &&
                t.isIdentifier(object.property) && object.property.name === 'exports';

              if (isExportsIdentifier || isModuleExports) {
                name = path.node.left.property.name;
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

        // クラスメソッド
        ClassMethod(path) {
          if (t.isIdentifier(path.node.key)) {
            const name = path.node.key.name;
            const params = getParams(path.node.params);

            const parentClass = path.findParent((p) => p.isClassDeclaration());
            let isExported = false;

            if (parentClass) {
              if (t.isExportNamedDeclaration(parentClass.parent) || t.isExportDefaultDeclaration(parentClass.parent)) {
                isExported = true;
              }
            }

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: isExported,
                arg: params,
                filePath,
                start: path.node.start,
                end: path.node.end,
              });
            }
          }
        },

        // クラスプロパティ (アロー関数など: prop = () => {})
        ClassProperty(path) {
          if (
            t.isIdentifier(path.node.key) &&
            path.node.value &&
            (t.isArrowFunctionExpression(path.node.value) || t.isFunctionExpression(path.node.value))
          ) {
            const name = path.node.key.name;
            const params = getParams(path.node.value.params);

            const parentClass = path.findParent((p) => p.isClassDeclaration());
            let isExported = false;

            if (parentClass) {
              if (t.isExportNamedDeclaration(parentClass.parent) || t.isExportDefaultDeclaration(parentClass.parent)) {
                isExported = true;
              }
            }

            if (!resultArray.some((func) => func.name === name)) {
              resultArray.push({
                name,
                isExported: isExported,
                arg: params,
                filePath,
                start: path.node.value.start,
                end: path.node.value.end,
              });
            }
          }
        }
      });

      resultArray.forEach((func) => {
        if (explicitlyExportedNames.has(func.name)) {
          func.isExported = true;
        }
      });
    }
  } catch (error) {
    console.log(`getFunc Failed to process file: ${filePath}. Error: ${error}`);
  }

  if (mode === 0) {
    return toExportedFunctionInfo(resultArray);
  } else if (mode === 1) {
    return resultArray.map((func) => ({
      funcname: func.name,
      arg: func.arg,
      filePath: func.filePath,
      start: func.start,
      end: func.end,
    }));
  } else {
    throw new Error('Invalid mode specified. Use 0 for exported functions only or 1 for all functions.');
  }
};

function toExportedFunctionInfo(data: FunctionMetaInfo[]): FunctionInfo_funcRange[] {
  return data
    .filter((func) => func.isExported)
    .map((func) => ({
      funcname: func.name,
      arg: func.arg,
      filePath: func.filePath,
      start: func.start,
      end: func.end,
    }));
}
(async () => {
  try {
    // 実行結果のログ出力
    const result = await getFunction('../../__tests__/inputFiles/functionSample/data1.js', 1);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
})();