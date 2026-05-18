import { promises as fsPromises } from 'fs';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

import { FunctionInfo_funcRange } from '../../types/FunctionInfo';
import { getFunction } from '../trace/getFunction';
import { rangeArg } from '../scope/rangeArg';
import { InboundFunctionDependencies } from '../../types/FileDependencies';
import { VariableUsage } from '../../types/VariableUsage';
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';
import { createAstFromFile } from '../base/createAstFromFile';

/**
 * 指定ファイル内で funcName を使用している呼び出し箇所をASTで解析し、
 * 引数の型（argTypes）とコードスニペット（argContexts）を再帰的に追跡して返す。
 * 引数が別ファイルの関数を経由している場合も funcDepend を辿って解決する。
 * @param filePath 解析対象ファイルのパス
 * @param funcName 追跡対象の関数・ライブラリ名
 * @param funcDepend 逆引き依存関係マップ（呼び出し元ファイルを特定するために使用）
 * @param visited 循環依存ガード（同一キーへの訪問回数を記録、最大3回まで許容）
 * @returns 検出された関数呼び出しごとの型・スニペット情報の配列
 */
export const analyzeArgAndMethod = async (
  filePath: string,
  funcName: string,
  funcDepend: InboundFunctionDependencies[],
  visited: Map<string, number> = new Map(), // 循環依存による無限再帰を防ぎつつ、数回（ここでは3回）の循環を許容するためのマップ
  resultCache: Map<string, ExtractFunctionCallsResult[]> = new Map() // LOOK: 訪問上限到達時に前回結果を返すためのキャッシュ（[]返しによる情報ロスを防ぐ）
): Promise<ExtractFunctionCallsResult[]> => {
  const visitKey = `${filePath}::${funcName}`;
  const visitCount = visited.get(visitKey) || 0;
  // LOOK: 訪問回数が上限（10回）を超えた場合、前回キャッシュを返して情報ロスを抑制する
  //       キャッシュがない場合のみ [] を返す（循環依存の初回到達時）
  if (visitCount >= 10) {
    return resultCache.get(visitKey) ?? [];
  }
  visited.set(visitKey, visitCount + 1);

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
    const parsed = createAstFromFile(filePath, fileContent);
    if (parsed === null) {
      return [];
    }
    const allFunctions: FunctionInfo_funcRange[] = await getFunction(filePath, 1);

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
            init.arguments.some((arg) => {
              if (
                t.isIdentifier(arg) &&
                new RegExp(`^${funcName}(?![a-zA-Z])`).test(arg.name)
              ) {
                return true;
              }
              return false;
            })
          ) {
            if (
              declarationNode.node.start != null &&
              declarationNode.node.end != null
            ) {
              const code: string = String(fileContent.substring(
                declarationNode.node.start,
                declarationNode.node.end,
              ) + '');
              syncResults.push({
                FunctionCallCode: code,
                filePath: filePath,
                line: declarationNode.node.loc ? declarationNode.node.loc.start.line : 0,
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
          if (
            declarationNode.node.start != null &&
            declarationNode.node.end != null
          ) {
            const code: string = String(fileContent.substring(
              declarationNode.node.start,
              declarationNode.node.end,
            ) + '');
            syncResults.push({
              FunctionCallCode: code,
              filePath: filePath,
              line: declarationNode.node.loc ? declarationNode.node.loc.start.line : 0,
              argTypes: [[]],
              argContexts: [[]],
            });
          }
        }
      },

      CallExpression(path: NodePath<t.CallExpression>) {
        const processCall = async (): Promise<ExtractFunctionCallsResult | null> => {
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
            const code: string = String(fileContent.substring(path.node.start, path.node.end) + '');
            const { finalArgTypes, finalArgContexts } = await analyzeArguments(
              path.node.arguments,
              fileContent,
              allFunctions,
              funcDepend,
              visited, // 無限ループ対策
              parsed,
              resultCache
            );

            const dedupedArgTypes = finalArgTypes.map((types) => [
              ...new Set(types),
            ]);
            const dedupedArgContexts = finalArgContexts.map((contexts) => [
              ...new Set(contexts),
            ]);
            return {
              FunctionCallCode: code,
              filePath: filePath,
              line: path.node.loc ? path.node.loc.start.line : 0,
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
            const code: string = String(fileContent.substring(
              path.node.start,
              path.node.end,
            ) + '');
            const { finalArgTypes, finalArgContexts } =
              await analyzeArguments(
                path.node.arguments,
                fileContent,
                allFunctions,
                funcDepend,
                visited, // 無限ループ対策
                parsed,
                resultCache
              );

            const dedupedArgTypes = finalArgTypes.map((types) => [
              ...new Set(types),
            ]);
            const dedupedArgContexts = finalArgContexts.map((contexts) => [
              ...new Set(contexts),
            ]);
            return {
              FunctionCallCode: code,
              filePath: filePath,
              line: path.node.loc ? path.node.loc.start.line : 0,
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

    syncResults.push(...validAsyncResults);
    resultCache.set(visitKey, syncResults); // 次回の上限超過時に返すためキャッシュ
    return syncResults;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unknown error occurred', error);
    }
    return [];
  }
};

/**
 * 引数を解析し、その型とコンテキストを特定する関数
 * @param args 解析対象の引数ノードの配列
 * @param fileContent ファイルの全コンテンツ
 * @param allFunctions ファイル内の全関数情報
 * @param funcDepend 逆引きされた依存関係情報
 * @param parsed ファイルのAST（this.property追跡に使用）
 * @returns 引数の型とコンテキストの解析結果
 */
async function analyzeArguments(
  args: (t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder)[],
  fileContent: string,
  allFunctions: FunctionInfo_funcRange[],
  funcDepend: InboundFunctionDependencies[],
  visited: Map<string, number>, // 無限ループ対策
  parsed: t.File,
  resultCache: Map<string, ExtractFunctionCallsResult[]> // 訪問上限時のキャッシュ
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
      !('start' in arg && 'end' in arg &&
        arg.start !== null && arg.end !== null
      )
    )
      continue;

    // ケース1: 識別子（変数名）— 同ファイル内の代入を遡り、関数引数であれば呼び出し元ファイルへ再帰追跡
    if (t.isIdentifier(arg)) {
      // arg.start を渡すことで、呼び出し地点を含む最も内側のスコープのみを参照する（シャドーイング対応）
      const usages: VariableUsage[] = rangeArg(fileContent, arg.name, arg.start!);
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
      // 親関数から渡された引数だった場合
      if (isUserFuncArg) {
        for (const one of relatedFuncs) {
          const outerFuncDef = allFunctions.find((f) => f.funcname === one);
          const outerArgIndex = outerFuncDef ?
            outerFuncDef.arg.indexOf(arg.name) :
            -1;
          if (outerArgIndex === -1) continue;

          const filterData = funcDepend.filter(
            (item) => item.funcNameInFilepath === one,
          );
          for (const checker of filterData) {
            for (const outFileDep of checker.dependence) {
              const recursiveResult = await analyzeArgAndMethod(
                outFileDep.dep_filepath,
                one,
                funcDepend,
                visited,
                resultCache
              );
              for (const recResult of recursiveResult) {
                const typesFromRec = recResult.argTypes?.[outerArgIndex] || [];
                const contextsFromRec =
                  recResult.argContexts?.[outerArgIndex] || [];

                finalArgTypes[index].push(...typesFromRec);
                finalArgContexts[index].push(
                  ...contextsFromRec.map(cleanCodeSnippet)
                );
              }
            }
          }
        }
      }
      // 変数追跡の結果、関数引数以外の場合
      const argType_tmp: string[] = [];
      const argContexts_tmp: string[] = [];
      for (const usageItem of usages) {
        for (const codeSnippet of usageItem.code) {
          // 三項演算子があれば then/else 両ブランチを展開して追加
          for (const { type, context } of resolveToTypeContextPairs(codeSnippet)) {
            argType_tmp.push(type);
            argContexts_tmp.push(context);
          }
        }
      }
      finalArgTypes[index].push(...argType_tmp);
      finalArgContexts[index].push(...argContexts_tmp);

      if (finalArgTypes[index].length === 0) {
        if (arg.start !== undefined && arg.end !== undefined) {
          const snippet = String(fileContent.substring(arg.start, arg.end) + '');
          finalArgTypes[index].push('unknown');
          finalArgContexts[index].push(cleanCodeSnippet(snippet));
        }
      }

    } else if (
      t.isMemberExpression(arg) &&
      t.isIdentifier(arg.object) &&
      !arg.computed &&
      t.isIdentifier(arg.property)
    ) {
      // ケース1.5: obj.prop — obj を変数追跡して該当プロパティの値の型を取得
      // e.g. options.rate → options = { rate: 0.5, ... } → 'number'
      const objName  = (arg.object as t.Identifier).name;
      const propName = (arg.property as t.Identifier).name;
      const usages = rangeArg(fileContent, objName, arg.start!);
      for (const usageItem of usages) {
        for (const codeSnippet of usageItem.code) {
          const propValue = extractPropertyValueFromObjectCode(codeSnippet, propName);
          if (propValue !== null) {
            // プロパティ値が三項演算子の場合は両ブランチを展開
            for (const { type, context } of resolveToTypeContextPairs(propValue)) {
              finalArgTypes[index].push(type);
              finalArgContexts[index].push(context);
            }
          }
        }
      }
      if (finalArgTypes[index].length === 0) {
        const snippet = String(fileContent.substring(arg.start!, arg.end!) + '');
        finalArgTypes[index].push('unknown');
        finalArgContexts[index].push(cleanCodeSnippet(snippet));
      }

    } else if (
      t.isMemberExpression(arg) &&
      t.isThisExpression(arg.object) &&
      !arg.computed &&
      t.isIdentifier(arg.property)
    ) {
      // ケース2: this.property — 呼び出し地点を含むクラス内のコンストラクタ代入・クラスプロパティを走査して代入値を収集
      const propName = arg.property.name;
      // arg.start! を渡すことで、複数クラスが存在する場合も呼び出し地点のクラスに限定する
      const thisValues = collectThisPropertyValues(parsed, propName, fileContent, arg.start!);
      for (const valueCode of thisValues) {
        // コンストラクタ代入値が三項演算子の場合は両ブランチを展開
        for (const { type, context } of resolveToTypeContextPairs(valueCode)) {
          finalArgTypes[index].push(type);
          finalArgContexts[index].push(context);
        }
      }
      if (finalArgTypes[index].length === 0) {
        const snippet = String(fileContent.substring(arg.start!, arg.end!) + '');
        finalArgTypes[index].push('unknown');
        finalArgContexts[index].push(cleanCodeSnippet(snippet));
      }

    } else if (t.isObjectExpression(arg)) {
      // ケース3: オブジェクトリテラルが直接引数 — 文字列パースより確実なASTノードからキーを抽出
      const keys = extractObjectPropertyKeys(arg);
      const keyType = keys.length > 0 ? `object:{${keys.join(',')}}` : 'object';
      finalArgTypes[index].push(keyType);
      const snippet = String(fileContent.substring(arg.start!, arg.end!) + '');
      finalArgContexts[index].push(cleanCodeSnippet(snippet));

    } else {
      // ケース4: 数値・文字列リテラルや演算式など — コード文字列から型を推論
      //          三項演算子の場合は then/else 両ブランチを展開して追加
      if (arg.start !== undefined && arg.end !== undefined) {
        const snippet = String(fileContent.substring(arg.start, arg.end) + '');
        for (const { type, context } of resolveToTypeContextPairs(snippet)) {
          finalArgTypes[index].push(type);
          finalArgContexts[index].push(context);
        }
      } else {
        console.warn('arg.start or arg.end is undefined');
      }
    }
  }
  return { finalArgTypes, finalArgContexts };
}

/**
 * ObjectExpression ASTノードからトップレベルのプロパティキー一覧を抽出する。
 *
 * 対応キー形式:
 *   { foo: val }              → 'foo'           （通常 Identifier キー）
 *   { 'foo': val }            → 'foo'           （StringLiteral キー）
 *   { [Symbol.iterator]: val} → '[Symbol.xxx]'  （computed Symbol キー）
 *   { ['foo']: val }          → 'foo'           （computed 文字列キー、通常キーと等価）
 *   { fn() {} }               → 'fn'            （ObjectMethod）
 */
function extractObjectPropertyKeys(node: t.ObjectExpression): string[] {
  const keys: string[] = [];
  for (const prop of node.properties) {
    if (t.isObjectProperty(prop)) {
      if (!prop.computed) {
        // 通常キー: { foo: val } / { 'foo': val }
        if (t.isIdentifier(prop.key)) {
          keys.push(prop.key.name);
        } else if (t.isStringLiteral(prop.key)) {
          keys.push(prop.key.value);
        }
      } else {
        // computed キー: { [Symbol.xxx]: val } / { ['foo']: val }
        if (
          t.isMemberExpression(prop.key) &&
          t.isIdentifier(prop.key.object, { name: 'Symbol' }) &&
          t.isIdentifier(prop.key.property)
        ) {
          keys.push(`[Symbol.${(prop.key.property as t.Identifier).name}]`);
        } else if (t.isStringLiteral(prop.key)) {
          keys.push(prop.key.value);
        }
      }
    } else if (t.isObjectMethod(prop)) {
      if (!prop.computed && t.isIdentifier(prop.key)) {
        keys.push(prop.key.name);
      } else if (prop.computed && t.isMemberExpression(prop.key) &&
                 t.isIdentifier(prop.key.object, { name: 'Symbol' }) &&
                 t.isIdentifier(prop.key.property)) {
        keys.push(`[Symbol.${(prop.key.property as t.Identifier).name}]`);
      }
    }
  }
  return keys;
}

/**
 * コード文字列がオブジェクト型の場合、可能な限りトップレベルキーを抽出して
 * "object:{key1,key2,...}" 形式で返す。それ以外は inferTypeFromCode に委譲する。
 *
 * 対応パターン:
 *   { key: val }                       → object:{key}           （直接リテラル）
 *   Object.assign({ key: val }, ...)   → object:{key}           （assignの第1引数から）
 *   Object.create({ key: val })        → object:{key}
 *   { ...spread, key: val }            → object:{key}           （スプレッド外のキーのみ）
 *   new SomeClass(...) / unknown expr  → object                 （キー不明）
 */
function inferTypeFromCodeWithKeys(code: string): string {
  const baseType = inferTypeFromCode(code);
  if (baseType !== 'object') return baseType;

  const cleaned = cleanCodeSnippet(code).trim();

  // LOOK: Object.assign / Object.create など — 全引数のオブジェクトリテラルからキーをマージして抽出
  if (/^[\w$]+\.(assign|create|fromEntries|merge)\s*\(/.test(cleaned)) {
    const objArgs = extractAllObjectArgsFromCall(cleaned);
    const allKeys = [...new Set(objArgs.flatMap(obj => extractKeysFromObjectCode(obj)))];
    return allKeys.length > 0 ? `object:{${allKeys.join(',')}}` : 'object';
  }

  // 直接オブジェクトリテラル（{ ...spread, key: val } も含む）
  const keys = extractKeysFromObjectCode(code);
  return keys.length > 0 ? `object:{${keys.join(',')}}` : 'object';
}

/**
 * オブジェクトリテラル文字列からトップレベルのキー名をヒューリスティックに抽出する
 * ネスト・文字列リテラル内のコロンを無視してトップレベルのキーのみを対象とする
 */
function extractKeysFromObjectCode(code: string): string[] {
  const cleaned = cleanCodeSnippet(code).trim();
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) return [];

  const inner = cleaned.slice(1, -1);
  const keys: string[] = [];
  let depth = 0;
  let inStr = false;
  let strChar = '';
  let tokenStart = 0;

  // depth と inStr でネスト・文字列リテラル内のカンマを無視し、トップレベルのキーのみを抽出する
  for (let i = 0; i <= inner.length; i++) {
    const ch = i < inner.length ? inner[i] : ','; // 末尾を , とみなして最後のトークンを flush
    if (inStr) {
      if (ch === strChar && inner[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth--; continue; }
    if (ch === ',' && depth === 0) {
      const token = inner.slice(tokenStart, i).trim();
      tokenStart = i + 1;
      const colonIdx = token.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = token.slice(0, colonIdx).trim().replace(/^['"`]|['"`]$/g, '');
        if (/^[\w$]+$/.test(keyPart)) {
          // 通常のキー: { foo: val }
          keys.push(keyPart);
        } else {
          // computed symbol key: { [Symbol.iterator]: val } → "[Symbol.iterator]"
          const symbolMatch = keyPart.match(/^\[Symbol\.(\w+)\]$/);
          if (symbolMatch) {
            keys.push(`[Symbol.${symbolMatch[1]}]`);
          } else {
            // computed string key: { ['foo']: val } — 通常キーと等価なのでそのまま
            const strKeyMatch = keyPart.match(/^\[['"`](\w+)['"`]\]$/);
            if (strKeyMatch) keys.push(strKeyMatch[1]);
          }
        }
      } else if (token && /^[\w$]+$/.test(token)) {
        // shorthand property: { foo }
        keys.push(token);
      }
    }
  }
  return keys;
}

/**
 * オブジェクトリテラル文字列から指定キーの値コードを抽出する。
 * キーが存在しない、またはオブジェクトリテラルでない場合は null を返す。
 *
 * e.g. extractPropertyValueFromObjectCode('{ rate: 0.5, timeout: 100 }', 'rate') → '0.5'
 *      extractPropertyValueFromObjectCode('{ fn: () => 1 }', 'fn')               → '() => 1'
 */
function extractPropertyValueFromObjectCode(code: string, propName: string): string | null {
  const cleaned = cleanCodeSnippet(code).trim();
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) return null;

  const inner = cleaned.slice(1, -1);
  let depth = 0;
  let inStr = false;
  let strChar = '';
  let tokenStart = 0;

  for (let i = 0; i <= inner.length; i++) {
    const ch = i < inner.length ? inner[i] : ',';
    if (inStr) {
      if (ch === strChar && inner[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth--; continue; }

    if (ch === ',' && depth === 0) {
      const token = inner.slice(tokenStart, i).trim();
      tokenStart = i + 1;

      const colonIdx = token.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = token.slice(0, colonIdx).trim().replace(/^['"`]|['"`]$/g, '');
        if (keyPart === propName) {
          return token.slice(colonIdx + 1).trim();
        }
      }
    }
  }
  return null;
}

/**
 * 関数呼び出し式からオブジェクトリテラル引数（{...}）を全て抽出する。
 * Object.assign({ a: 1 }, { b: 2 }) → ['{ a: 1 }', '{ b: 2 }']
 *
 * トップレベルのカンマで引数に分割し、{...} で始まる引数のみを返す。
 */
function extractAllObjectArgsFromCall(code: string): string[] {
  const parenIdx = code.indexOf('(');
  if (parenIdx === -1) return [];

  // 外側の () の範囲を特定する
  let depth = 0;
  let parenEnd = -1;
  let inStr = false;
  let strChar = '';

  for (let i = parenIdx; i < code.length; i++) {
    const ch = code[i];
    if (inStr) {
      if (ch === strChar && code[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; if (depth === 0) { parenEnd = i; break; } }
  }
  if (parenEnd === -1) return [];

  // トップレベルのカンマで引数に分割する
  const argsStr = code.slice(parenIdx + 1, parenEnd);
  const args: string[] = [];
  let argStart = 0;
  depth = 0; inStr = false; strChar = '';

  for (let i = 0; i <= argsStr.length; i++) {
    const ch = i < argsStr.length ? argsStr[i] : ','; // 末尾を , とみなして最後の引数を flush
    if (inStr) {
      if (ch === strChar && argsStr[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
    if (ch === ',' && depth === 0) {
      args.push(argsStr.slice(argStart, i).trim());
      argStart = i + 1;
    }
  }

  // オブジェクトリテラル形式の引数のみ返す
  return args.filter(arg => arg.startsWith('{') && arg.endsWith('}'));
}

/**
 * ASTを走査し、this.propName に代入している箇所の右辺コードを収集する。
 * callSitePos を基に呼び出し地点を含む最も内側のクラスに絞って検索するため、
 * 複数クラスに同名プロパティが存在しても誤収集しない。
 * @param parsed ファイルのAST
 * @param propName 追跡対象のプロパティ名
 * @param fileContent ファイルの全コンテンツ
 * @param callSitePos this.property が使われている呼び出し地点の文字オフセット
 */
function collectThisPropertyValues(
  parsed: t.File,
  propName: string,
  fileContent: string,
  callSitePos: number,
): string[] {
  const values: string[] = [];

  // 呼び出し地点を含む最も内側のクラス範囲を特定する
  // ネストクラスが存在する場合は start が最大（= 最小スコープ）のクラスを優先する
  let classRange: { start: number; end: number } | null = null;

  const updateClassRange = (node: t.ClassDeclaration | t.ClassExpression) => {
    const { start, end } = node;
    if (start != null && end != null && start <= callSitePos && end >= callSitePos) {
      if (classRange === null || start > classRange.start) {
        classRange = { start, end };
      }
    }
  };

  traverse(parsed, {
    ClassDeclaration(path) { updateClassRange(path.node); },
    ClassExpression(path) { updateClassRange(path.node); },
  });

  traverse(parsed, {
    // this.propName = expr（コンストラクタ内の代入など）
    AssignmentExpression(path) {
      // クラス範囲が特定できた場合はその範囲外をスキップ
      if (classRange !== null) {
        if (path.node.start! < classRange.start || path.node.end! > classRange.end) return;
      }
      const { left, right } = path.node;
      if (
        t.isMemberExpression(left) &&
        t.isThisExpression(left.object) &&
        !left.computed &&
        t.isIdentifier(left.property, { name: propName }) &&
        right.start != null &&
        right.end != null
      ) {
        values.push(fileContent.substring(right.start, right.end));
      }
    },
    // class Foo { propName = expr }（クラスフィールド宣言）
    ClassProperty(path) {
      if (classRange !== null) {
        if (path.node.start! < classRange.start || path.node.end! > classRange.end) return;
      }
      if (
        !path.node.computed &&
        t.isIdentifier(path.node.key, { name: propName }) &&
        path.node.value &&
        path.node.value.start != null &&
        path.node.value.end != null
      ) {
        values.push(fileContent.substring(path.node.value.start, path.node.value.end));
      }
    },
  });

  return values;
}

/**
 * コードスニペットから簡易的な型推論を行う。
 * @param code 評価するコードの文字列
 * @returns 推論された型名（'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'array' | 'object' | 'function' | 'unknown'）
 */
function inferTypeFromCode(
  code: string,
): 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'array' | 'object' | 'function' | 'unknown' {
  const cleanCode = cleanCodeSnippet(code);

  if (/^-?\d+(\.\d+)?$/.test(cleanCode)) return 'number';
  if (/^(['"]).*\1$/.test(cleanCode)) return 'string';
  if (/^`.*`$/s.test(cleanCode)) return 'string';
  if (cleanCode === 'true' || cleanCode === 'false') return 'boolean';
  if (cleanCode === 'null') return 'null';
  if (cleanCode === 'undefined') return 'undefined';

  if (/^(\(.*\)|[^=\s]+)\s*=>/.test(cleanCode)) return 'function';
  if (/^function\s*\(/.test(cleanCode)) return 'function';

  // \[ と \{ を使用（\\[ や \\{ は「バックスラッシュ+括弧」にマッチするため誤り）
  if (/^\[.*\]$/s.test(cleanCode)) return 'array';
  if (/^\{.*\}$/s.test(cleanCode)) return 'object';
  if (/^new\s+/.test(cleanCode)) return 'object';
  if (/^[\w$]+\.(assign|create|fromEntries|merge|keys|values)\b/.test(cleanCode)) return 'object';

  if (/(===|!==|==|!=|<=|>=|<|>)/.test(cleanCode) && !/=>/.test(cleanCode)) {
    return 'boolean';
  }
  if (/[\+\-\*\/%]/.test(cleanCode) && !/['"`]/.test(cleanCode)) return 'number';

  return 'unknown';
}

/**
 * 三項演算子 `cond ? thenBranch : elseBranch` をトップレベルで分割する。
 * ネスト（括弧・オブジェクト・配列）内の `?` や `:` は無視する。
 * 三項演算子でなければ null を返す。
 *
 * 除外パターン:
 *   - オプショナルチェーン `?.`  → `?` の直後が `.`
 *   - Nullish 合体演算子 `??`   → `?` が連続
 */
function splitTernaryBranches(code: string): [string, string] | null {
  const cleaned = cleanCodeSnippet(code).trim();
  let depth = 0;
  let inStr = false;
  let strChar = '';
  let questionIdx = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (ch === strChar && cleaned[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
    if (
      ch === '?' && depth === 0 &&
      cleaned[i + 1] !== '.' &&             // オプショナルチェーン ?. を除外
      cleaned[i + 1] !== '?' &&             // nullish 合体 ?? の1文字目を除外
      (i === 0 || cleaned[i - 1] !== '?')   // nullish 合体 ?? の2文字目を除外
    ) {
      questionIdx = i;
      break;
    }
  }

  if (questionIdx === -1) return null;

  // `?` 以降でトップレベルの `:` を探して then/else に分割する
  const afterQ = cleaned.slice(questionIdx + 1).trim();
  depth = 0; inStr = false; strChar = '';

  for (let i = 0; i < afterQ.length; i++) {
    const ch = afterQ[i];
    if (inStr) {
      if (ch === strChar && afterQ[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
    if (ch === ':' && depth === 0) {
      return [afterQ.slice(0, i).trim(), afterQ.slice(i + 1).trim()];
    }
  }
  return null;
}

/**
 * コードスニペットを型・コンテキストのペア配列に変換する。
 * 三項演算子があれば then/else 両ブランチを再帰的に展開して複数エントリを返す。
 * それ以外は inferTypeFromCodeWithKeys による単一エントリ。
 *
 * 例:
 *   'isNum ? 42 : "text"'      → [{ type: 'number', context: '42' },
 *                                  { type: 'string', context: '"text"' }]
 *   'a ? b ? 1 : 2 : "x"'     → [{ type:'number', context:'1' },
 *                                  { type:'number', context:'2' },
 *                                  { type:'string', context:'"x"' }]  （ネスト三項も展開）
 *   '{ a: 1 }'                 → [{ type: 'object:{a}', context: '{ a: 1 }' }]
 */
function resolveToTypeContextPairs(code: string): { type: string; context: string }[] {
  const branches = splitTernaryBranches(code);
  if (branches) {
    // then/else 両ブランチを再帰的に展開（ネスト三項にも対応）
    return [
      ...resolveToTypeContextPairs(branches[0]),
      ...resolveToTypeContextPairs(branches[1]),
    ];
  }
  return [{ type: inferTypeFromCodeWithKeys(code), context: cleanCodeSnippet(code) }];
}

/**
 * コードスニペットからブロックコメント・行コメント・改行・余分な空白を除去して正規化する。
 * @param code 正規化対象のコード文字列
 * @returns 正規化済みのコード文字列（1行・余分スペースなし）
 */
function cleanCodeSnippet(code: string): string {
  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/[\n\r\t]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}