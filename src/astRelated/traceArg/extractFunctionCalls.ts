import { promises as fsPromises } from 'fs';
import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { FunctionInfo_funcRange } from '../types/FunctionMetaInfo';
import { getFunc } from './getFunc';
import { rangeArg } from '../rangeArg/rangeArg';
import { InboundFunctionDependencies } from '../types/FileDependencies';
import { VariableUsage } from '../types/VariableUsage';
import { ExtractFunctionCallsResult } from '../types/ExtractFunctionCallsResult';

/**
 * 引数を解析し、その型とコンテキストを特定するヘルパー関数
 * @param args 解析対象の引数ノードの配列
 * @param fileContent ファイルの全コンテンツ
 * @param allFunctions ファイル内の全関数情報
 * @param funcDepend 逆引きされた依存関係情報
 * @returns 引数の型とコンテキストの解析結果
 */
async function analyzeArguments(
  args: (
    | t.Expression
    | t.SpreadElement
    | t.JSXNamespacedName
    | t.ArgumentPlaceholder
  )[],
  fileContent: string,
  allFunctions: FunctionInfo_funcRange[],
  funcDepend: InboundFunctionDependencies[],
): Promise<{ finalArgTypes: string[][]; finalArgContexts: string[][] }> {
  const finalArgTypes: string[][] = Array.from(
    { length: args.length },
    () => [],
  );
  const finalArgContexts: string[][] = Array.from(
    { length: args.length },
    () => [],
  );

  for (const [index, arg] of args.entries()) {
    if (
      !arg ||
      !(
        'start' in arg &&
        'end' in arg &&
        arg.start !== null &&
        arg.end !== null
      )
    )
      continue;

    if (t.isIdentifier(arg)) {
      const usages: VariableUsage[] = rangeArg(fileContent, arg.name);
      let isUserFuncArg = false;
      const relatedFuncs = new Set<string>();

      for (const usage of usages) {
        for (const func of allFunctions) {
          if (
            func.arg.includes(arg.name) &&
            typeof func.start === 'number' &&
            typeof func.end === 'number' &&
            usage.varScopeStart !== undefined &&
            usage.varScopeEnd !== undefined &&
            func.start <= usage.varScopeStart &&
            func.end >= usage.varScopeEnd
          ) {
            if (
              arg.start !== undefined &&
              arg.end !== undefined &&
              arg.start >= func.start &&
              arg.end <= func.end
            ) {
              isUserFuncArg = true;
              relatedFuncs.add(func.funcname);
            }
          }
        }
      }

      if (isUserFuncArg) {
        for (const one of relatedFuncs) {
          const outerFuncDef = allFunctions.find((f) => f.funcname === one);
          const outerArgIndex = outerFuncDef ?
            outerFuncDef.arg.indexOf(arg.name) :
            -1;
          if (outerArgIndex === -1) continue;

          // Fix typo: fillterData -> filterData
          const filterData = funcDepend.filter(
            (item) => item.funcNameInFilepath === one,
          );
          for (const checker of filterData) {
            for (const outFileDep of checker.dependence) {
              const recursiveResult = await extractFunctionCalls(
                outFileDep.dep_filepath,
                one,
                funcDepend,
              );
              for (const recResult of recursiveResult) {
                const typesFromRec = recResult.argTypes[outerArgIndex] || [];
                const contextsFromRec =
                  recResult.argContexts[outerArgIndex] || [];
                finalArgTypes[index].push(...typesFromRec);
                finalArgContexts[index].push(...contextsFromRec);
              }
            }
          }
        }
      } else {
        const argType_tmp: string[] = [];
        const argContexts_tmp: string[] = [];
        for (const usageItem of usages) {
          for (const codeSnippet of usageItem.code) {
            argType_tmp.push(inferTypeFromCode(codeSnippet));
            argContexts_tmp.push(codeSnippet);
          }
        }
        finalArgTypes[index].push(...argType_tmp);
        finalArgContexts[index].push(...argContexts_tmp);
      }
    } else {
      if (arg.start !== undefined && arg.end !== undefined) {
        const snippet = fileContent.substring(arg.start, arg.end);
        finalArgTypes[index].push(inferTypeFromCode(snippet));
        finalArgContexts[index].push(snippet);
      } else {
        console.warn('arg.start,');
      }
    }
  }
  return { finalArgTypes, finalArgContexts };
}

export const extractFunctionCalls = async (
  filePath: string,
  funcName: string,
  funcDepend: InboundFunctionDependencies[],
): Promise<ExtractFunctionCallsResult[]> => {
  try {
    const syncResults: ExtractFunctionCallsResult[] = [];
    const promises: Promise<ExtractFunctionCallsResult | null>[] = [];

    if (
      !filePath.endsWith('.js') &&
      !filePath.endsWith('.ts') &&
      !filePath.endsWith('.jsx') &&
      !filePath.endsWith('.tsx')
    ) {
      return [];
    }

    const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
    const parsed: t.File = parser.parse(fileContent, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    const allFunctions: FunctionInfo_funcRange[] = await getFunc(filePath, 1);

    traverse(parsed, {
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        const declarationNode = path.findParent(
          (p): p is NodePath<t.VariableDeclaration> =>
            p.isVariableDeclaration(),
        );
        if (!declarationNode) return;

        const initNode = path.node.init;
        if (!initNode) return;

        if (
          t.isCallExpression(initNode) &&
          t.isIdentifier(initNode.callee) &&
          initNode.callee.name === '_interopRequireDefault'
        ) {
          const init = initNode;
          if (
            init.arguments &&
            // Avoid 'any' type
            init.arguments.some((arg) => {
              if (
                t.isIdentifier(arg) &&
                new RegExp(`^${funcName}(?![a-zA-Z])`).test(arg.name)
              ) {
                // eslint-disable-next-line no-console
                console.log(
                  `Variable found in _interopRequireDefault argument for ${funcName}: ${arg.name}`,
                );
                return true;
              }
              return false;
            })
          ) {
            // Add null check instead of using '!'
            if (
              declarationNode.node.start != null &&
              declarationNode.node.end != null
            ) {
              const code: string = fileContent.substring(
                declarationNode.node.start,
                declarationNode.node.end,
              );
              syncResults.push({
                FunctionCallCodes: [code],
                argTypes: [[]],
                argContexts: [[]],
              });
            }
          }
        } else if (
          t.isMemberExpression(initNode) &&
          t.isIdentifier(initNode.object, { name: funcName }) &&
          t.isIdentifier(initNode.property, { name: 'default' })
        ) {
          // Add null check instead of using '!'
          if (
            declarationNode.node.start != null &&
            declarationNode.node.end != null
          ) {
            const code = fileContent.substring(
              declarationNode.node.start,
              declarationNode.node.end,
            );
            syncResults.push({
              FunctionCallCodes: [code],
              argTypes: [[]],
              argContexts: [[]],
            });
          }
        }
      },

      CallExpression(path: NodePath<t.CallExpression>) {
        const processCall = async (): Promise<ExtractFunctionCallsResult | null> => {
          // Add null check for start/end
          if (path.node.start == null || path.node.end == null) {
            return null;
          }

          const callee = path.node.callee;
          let isTargetFound = false;
          if (t.isIdentifier(callee) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(callee.name)) {
            isTargetFound = true;
          } else if (t.isMemberExpression(callee)) {
            let current: t.Expression | t.V8IntrinsicIdentifier = callee.object;
            while (t.isMemberExpression(current)) {
              current = current.object;
            }
            if (t.isIdentifier(current) && new RegExp(`^${funcName}(?![a-zA-Z])`).test(current.name)) {
              isTargetFound = true;
            }
          }

          if (isTargetFound) {
            // Use node.start/end directly after null check
            const code: string = fileContent.substring(path.node.start, path.node.end);
            const { finalArgTypes, finalArgContexts } = await analyzeArguments(
              path.node.arguments,
              fileContent,
              allFunctions,
              funcDepend,
            );

            const dedupedArgTypes = finalArgTypes.map((types) => [
              ...new Set(types),
            ]);
            const dedupedArgContexts = finalArgContexts.map((contexts) => [
              ...new Set(contexts),
            ]);
            return {
              FunctionCallCodes: [code],
              argTypes: dedupedArgTypes,
              argContexts: dedupedArgContexts,
            };
          }
          return null;
        };
        promises.push(processCall());
      },

      NewExpression(path: NodePath<t.NewExpression>) {
        const processNew = async (): Promise<ExtractFunctionCallsResult | null> => {
          if (path.node.start == null || path.node.end == null) {
            return null;
          }

          const callee = path.node.callee;
          if (
            t.isIdentifier(callee) &&
            new RegExp(`^${funcName}(?![a-zA-Z])`).test(callee.name)
          ) {
            // Use node.start/end directly after null check
            const code: string = fileContent.substring(
              path.node.start,
              path.node.end,
            );
            const { finalArgTypes, finalArgContexts } =
              await analyzeArguments(
                path.node.arguments,
                fileContent,
                allFunctions,
                funcDepend,
              );

            const dedupedArgTypes = finalArgTypes.map((types) => [
              ...new Set(types),
            ]);
            const dedupedArgContexts = finalArgContexts.map((contexts) => [
              ...new Set(contexts),
            ]);
            return {
              FunctionCallCodes: [code],
              argTypes: dedupedArgTypes,
              argContexts: dedupedArgContexts,
            };
          }
          return null;
        };
        promises.push(processNew());
      },
    });

    const asyncResults = await Promise.all(promises);
    const validAsyncResults = asyncResults.filter(
      (result): result is ExtractFunctionCallsResult => result !== null,
    );

    return syncResults.concat(validAsyncResults);
  } catch (error: unknown) {
    console.error(
      `extractFunctionCalls: Failed to create AST for file: ${filePath}`,
    );
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unknown error occurred', error);
    }
    return [];
  }
};

/**
 * コードスニペットから簡易的な型推論を行う
 * @param code 評価するコードの文字列
 * @returns 推論された型名
 */
function inferTypeFromCode(
  code: string,
): 'number' | 'string' | 'boolean' | 'unknown' {
  if (/^\d+(\.\d+)?$/.test(code)) return 'number';
  if (/^(['"]).*\1$/.test(code)) return 'string';
  if (code === 'true' || code === 'false') return 'boolean';
  const regStr = new RegExp('[+*/%-]');
  if (regStr.test(code)) return 'number';
  if (/[><=!]=?/.test(code)) return 'boolean';
  if (/&&|\|\|/.test(code)) return 'boolean';
  if (/^.*\(.+\)/.test(code)) return 'unknown'; // 関数呼び出しの結果などは'unknown'
  return 'unknown';
}

// import { FunctionInfo } from '../types/FunctionInfo';
// import { getAllFiles } from '../utils/getAllFiles';
// import { reverseDependencies } from './reverseDependencies';
// import { getFileRelated } from './getFileRelated';
// import { OutboundFileDependencies,} from '../types/FileDependencies';
// (async () => {
//   try {
//     const allFiles: string[] = await getAllFiles('./sample');
//     const groupedDependencies: OutboundFileDependencies[] =
//       getFileRelated(allFiles);
//     // 依存関係を逆転させる
//     const reversed: InboundFunctionDependencies[] =
//       reverseDependencies(groupedDependencies);

//     // 定数
//     let result: ExtractFunctionCallsResult[] = await extractFunctionCalls('./sample/constant.js', 'roop_divide', reversed);
//     // // 変数：ファイル内入力
//     // let result: ExtractFunctionCallsResult[] = await extractFunctionCalls('./sample/main.js', 'roop_divide', reversed);
//     // // // 変数：ファイル外入力
//     // let result: ExtractFunctionCallsResult[] = await extractFunctionCalls('./sample/division.js', 'divide', reversed);
//     // let result: ExtractFunctionCallsResult[] = await extractFunctionCalls('./sample/user_factory.js', 'User', reversed);
//     const result: ExtractFunctionCallsResult[] = await extractFunctionCalls(
//       './sample/logger_wrapper.js',
//       'logger',
//       reversed,
//     );
//     // eslint-disable-next-line no-console
//     console.log(
//       'extractFunctionCalls Result:',
//       JSON.stringify(result, null, 2),
//     );
//   } catch (e: unknown) { // Use 'unknown' for catch
//     console.error('Execution failed:');
//     if (e instanceof Error) {
//       console.error(e.message);
//     } else {
//       console.error('An unknown error occurred', e);
//     }
//   }
// })();