import { ExtractFunctionCallsResult } from './types';

// =============================================================
// rawpattern 形式（---N プレースホルダー）のスクリプト生成
// =============================================================

/**
 * 呼び出し式から実際にアクセスするプロパティチェーンを抽出する。
 *
 * Examples:
 *   "_lib1.v4(null, buf, i)"  → "_lib1.v4"
 *   "_lib1()"                 → "_lib1"
 *   "_lib1.sync(opts)"        → "_lib1.sync"
 */
function extractAccessChain(callCode: string): string | null {
  // identifier(.prop)* の後に "(" が続くパターン
  const m = callCode.match(/^([\w$][\w$.]*)[\s(]/);
  if (m) return m[1];
  return null;
}

/**
 * rawpattern 形式のパターン（detectPatterns の1ファイルグループ）から
 * 実行可能な Node.js スクリプトを生成する。
 *
 * 変換ルール:
 *   import ---N from 'lib'      → const _libN = require('lib');
 *   ---N = require('lib')       → const _libN = require('lib');
 *   ---N = require('lib').prop  → const _libN = require('lib').prop;
 *   ---N.method(args)           → typeof _libN.method をチェック
 *   ---N(args)                  → typeof _libN をチェック
 *
 * require() が失敗すれば catch に落ち、プロパティが undefined なら
 * throw で catch に落ちる。これにより破壊的変更を検出できる。
 */
export function rawPatternToScript(
  fileGroup: ExtractFunctionCallsResult[],
  libName: string
): string {
  // ---N → _libN のマッピング
  const varMap: Record<string, string> = {};
  const requireLines: string[] = [];
  const checkLines: string[] = [];
  let libCounter = 1;

  for (const call of fileGroup) {
    const code = call.FunctionCallCode.trim();

    // --- import ---N from 'lib'  (default import) ---
    const importMatch = code.match(/^import\s+---(\d+)\s+from\s+['"`]([^'"` ]+)['"`]/);
    if (importMatch) {
      const [, num, modulePath] = importMatch;
      const varName = `_lib${libCounter++}`;
      varMap[`---${num}`] = varName;
      requireLines.push(`const ${varName} = require('${modulePath}');`);
      continue;
    }

    // --- import { exportName as ---N } from 'lib'  (named import with alias) ---
    // e.g. import { v4 as ---2 } from 'uuid'  →  const _lib2 = require('uuid').v4;
    const namedImportMatch = code.match(
      /^import\s*\{([^}]+)\}\s*from\s*['"`]([^'"` ]+)['"`]/
    );
    if (namedImportMatch) {
      const [, specifiers, modulePath] = namedImportMatch;
      // 各 specifier を処理（"exportName as ---N" または "exportName" の形）
      for (const spec of specifiers.split(',')) {
        const asMatch = spec.trim().match(/^(\w+)\s+as\s+---(\d+)$/);
        if (asMatch) {
          const [, exportName, num] = asMatch;
          const varName = `_lib${libCounter++}`;
          varMap[`---${num}`] = varName;
          requireLines.push(`const ${varName} = require('${modulePath}').${exportName};`);
        }
      }
      continue;
    }

    // --- ---N = require('lib') または ---N = require('lib').prop ---
    const requireMatch = code.match(/^---(\d+)\s*=\s*require\(['"`]([^'"` ]+)['"`]\)((?:\.\w+)*)/);
    if (requireMatch) {
      const [, num, modulePath, chain] = requireMatch;
      const varName = `_lib${libCounter++}`;
      varMap[`---${num}`] = varName;
      requireLines.push(`const ${varName} = require('${modulePath}')${chain};`);
      continue;
    }

    // --- 関数呼び出し: ---N を置換してアクセスチェーンを検査 ---
    let callCode = code;
    // ---N の長い番号から順に置換（---12 を ---1 の前に処理）
    const sortedEntries = Object.entries(varMap).sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [placeholder, varName] of sortedEntries) {
      callCode = callCode.split(placeholder).join(varName);
    }

    const chain = extractAccessChain(callCode);
    if (chain) {
      // typeof !== 'function' にすることで以下を両方検出できる:
      //   - プロパティが undefined になった（メソッド削除）
      //   - 関数だったものがオブジェクトに変わった（e.g. uuid v3→v7: require('uuid') が function → object）
      checkLines.push(
        `if (typeof ${chain} !== 'function') throw new Error('${chain} is not a function (got: ' + typeof ${chain} + ')');`
      );
    }
  }

  if (requireLines.length === 0) return '';

  return [
    `'use strict';`,
    `try {`,
    ...requireLines.map((l) => `  ${l}`),
    ...checkLines.map((l) => `  ${l}`),
    `  process.exit(0);`,
    `} catch (e) {`,
    `  process.stderr.write(String(e) + '\\n');`,
    `  process.exit(1);`,
    `}`,
  ].join('\n');
}

// =============================================================
// mode 1: import 変数単位への細分化
// =============================================================

/** import/require 行から (変数番号, モジュールパス) を抽出する。該当なければ null。 */
function parseImportLine(
  code: string
): { varNum: string; modulePath: string } | null {
  // import ---N from 'lib'
  const m1 = code.match(/^import\s+---(\d+)\s+from\s+['"`]([^'"` ]+)['"`]/);
  if (m1) return { varNum: m1[1], modulePath: m1[2] };

  // import { name as ---N } from 'lib'
  const m2 = code.match(/^import\s*\{[^}]*as\s+---(\d+)[^}]*\}\s*from\s*['"`]([^'"` ]+)['"`]/);
  if (m2) return { varNum: m2[1], modulePath: m2[2] };

  // ---N = require('lib') または ---N = require('lib').prop
  const m3 = code.match(/^---(\d+)\s*=\s*require\(['"`]([^'"` ]+)['"`]\)/);
  if (m3) return { varNum: m3[1], modulePath: m3[2] };

  return null;
}

/**
 * ファイルグループを import 変数単位に細分化する（splitMode=1 用）。
 *
 * 各 import ---N に対してサブグループを作る:
 *   - import 行（---N に対応）
 *   - ---N が access chain の先頭にある呼び出し行
 *   e.g. ---1.v4()  → ---1 グループ
 *        ---1(---3(x)) → ---1 グループ（引数内 ---3 は無視）
 *
 * import が1つしかない場合は分割不要として元のグループをそのまま返す。
 *
 * @returns { modulePath, subGroup }[] ─ modulePath はラベル生成に使用
 */
export function splitByImportVariable(
  fileGroup: ExtractFunctionCallsResult[]
): { modulePath: string; subGroup: ExtractFunctionCallsResult[] }[] {
  // import 変数の収集（キー: '---N'）
  // LOOK: 同じ modulePath が複数行あっても最初の行を採用（pdf-bot の重複 require 対策）
  const importMap = new Map<
    string,
    { call: ExtractFunctionCallsResult; modulePath: string }
  >();
  const seenModules = new Set<string>();

  for (const call of fileGroup) {
    const info = parseImportLine(call.FunctionCallCode.trim());
    if (!info) continue;
    const key = `---${info.varNum}`;
    if (!importMap.has(key) && !seenModules.has(info.modulePath)) {
      importMap.set(key, { call, modulePath: info.modulePath });
      seenModules.add(info.modulePath);
    }
  }

  // import が1つ以下なら分割不要
  if (importMap.size <= 1) return [];

  // 呼び出し行を primary variable で振り分ける
  // primary variable = 行先頭の ---N
  const callsByVar = new Map<string, ExtractFunctionCallsResult[]>();
  for (const key of importMap.keys()) callsByVar.set(key, []);

  for (const call of fileGroup) {
    const code = call.FunctionCallCode.trim();
    if (parseImportLine(code)) continue; // import 行はスキップ

    const primaryMatch = code.match(/^---(\d+)/);
    if (primaryMatch) {
      const key = `---${primaryMatch[1]}`;
      callsByVar.get(key)?.push(call);
    }
  }

  // サブグループを構築
  const results: { modulePath: string; subGroup: ExtractFunctionCallsResult[] }[] = [];
  for (const [key, { call, modulePath }] of importMap) {
    const calls = callsByVar.get(key) ?? [];
    results.push({ modulePath, subGroup: [call, ...calls] });
  }

  return results;
}

// =============================================================
// patternList 形式（正規表現パターン）のスクリプト生成（レガシー）
// =============================================================

/**
 * patternList 形式のパターンからスクリプトを生成する。
 * FunctionCallCode が正規表現形式（variable1, [^,]* など）のため、
 * argContexts の実際の値で補完する。
 *
 * TODO: 正規表現パターンは再構成精度が低い。可能なら rawpattern を使用すること。
 */
export function patternListToScript(
  pattern: ExtractFunctionCallsResult[][],
  libName: string
): string {
  const lines: string[] = [];
  const varMap: Record<string, string> = {};
  let varCounter = 1;

  for (const fileGroup of pattern) {
    for (const call of fileGroup) {
      const code = call.FunctionCallCode;

      const requireMatch = code.match(/require\(\[["'`\]]+([^"'`]+)/);
      const importMatch = code.match(/import\s+\S+\s+from\s+['"`]([^'"` ]+)/);
      const libMatch = requireMatch?.[1] ?? importMatch?.[1];

      if (libMatch?.includes(libName)) {
        const varNumMatch = code.match(/variable(\d+)/);
        if (varNumMatch) {
          const key = `variable${varNumMatch[1]}`;
          if (!varMap[key]) varMap[key] = `_lib${varCounter++}`;
          lines.push(`const ${varMap[key]} = require('${libName}');`);
        }
        continue;
      }

      let callCode = code;
      for (const [varKey, varName] of Object.entries(varMap)) {
        callCode = callCode.replace(new RegExp(varKey, 'g'), varName);
      }

      const flatArgs = call.argContexts.map((argGroup) => argGroup[0] ?? 'undefined');
      callCode = callCode.replace(/\[\^,\]\*/g, () => flatArgs.shift() ?? 'undefined');
      callCode = callCode.replace(/\[\^.[^\]]*\]\*/g, 'undefined').replace(/\(\?:[^)]+\)/g, '');
      callCode = callCode.replace(/\[^.]*\$$/, '').trim();

      if (callCode) lines.push(`${callCode};`);
    }
  }

  if (lines.length === 0) return '';

  return [
    `'use strict';`,
    `try {`,
    ...lines.map((l) => `  ${l}`),
    `  process.exit(0);`,
    `} catch (e) {`,
    `  process.stderr.write(String(e) + '\\n');`,
    `  process.exit(1);`,
    `}`,
  ].join('\n');
}
