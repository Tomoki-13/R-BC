import fs from 'fs';
import path from 'path';

import { analyzeArgAndMethod } from '../../astRelated/analyzer/analyzeArgandMethod';
import { getAllFiles } from '../../utils/getAllFiles';
import { getFileRelated } from '../../astRelated/trace/getFileRelated';
import { OutboundFileDependencies, InboundFunctionDependencies } from '../../types/FileDependencies';
import { reverseDependencies } from '../../astRelated/trace/reverseDependencies';
import { ExtractFunctionCallsResult } from '../../types/ExtractFunctionCallsResult';

// JSONと比較するために filePath と line を除外するヘルパー関数
const normalizeResults = (results: ExtractFunctionCallsResult[]) => {
  return results.map(({ FunctionCallCode, argTypes, argContexts }) => ({
    FunctionCallCode,
    argTypes,
    argContexts
  }));
};

describe('analyzeArgAndMethod test', () => {
  const filePath = path.resolve(__dirname, '../outputFiles/analyzeArgAndMethod.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let allFiles: string[];
  let groupedDependencies: OutboundFileDependencies[];
  let rev_groupedDependencies: InboundFunctionDependencies[];

  beforeAll(async () => {
    const inputPath = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod');
    allFiles = await getAllFiles(inputPath);
    groupedDependencies = getFileRelated(allFiles);
    rev_groupedDependencies = reverseDependencies(groupedDependencies);
  });

  test('tracks constant arguments within the same file', async () => {
    const expected = jsonData['tracks constant arguments within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/constant.js');
    const result = await analyzeArgAndMethod(file, 'roop_divide', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  test('tracks variable arguments defined within the same file', async () => {
    const expected = jsonData['tracks variable arguments defined within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/main.js');
    const result = await analyzeArgAndMethod(file, 'roop_divide', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  test('tracks variable arguments from an external file', async () => {
    const { division, logger_wrapper } = jsonData['tracks variable arguments from an external file'];
    const divisionFile = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/division.js');
    const loggerFile = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/logger_wrapper.js');

    const divisionResult = await analyzeArgAndMethod(divisionFile, 'divide', rev_groupedDependencies);
    const loggerResult = await analyzeArgAndMethod(loggerFile, 'logger', rev_groupedDependencies);
    expect(normalizeResults(divisionResult)).toEqual(division);
    expect(normalizeResults(loggerResult)).toEqual(logger_wrapper);
  });

  // オブジェクトリテラルが直接引数に渡される場合: ASTの ObjectExpression から型とキーを抽出できるか検証
  test('tracks direct object literal argument', async () => {
    const expected = jsonData['tracks direct object literal argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/object_direct.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // 変数にオブジェクトを代入してから引数に渡す場合: 変数追跡 + オブジェクトキー抽出の組み合わせを検証
  test('tracks object variable argument', async () => {
    const expected = jsonData['tracks object variable argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/object_via_variable.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // this.property が引数に渡される場合: クラス内のコンストラクタ代入を辿れるか検証
  test('tracks this.property argument', async () => {
    const expected = jsonData['tracks this.property argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/this_property.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // 別ファイルからオブジェクトが渡される場合: クロスファイル追跡で呼び出し元のオブジェクトリテラルまで辿れるか検証
  test('tracks object argument passed from external file', async () => {
    const expected = jsonData['tracks object argument passed from external file'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/object_wrapper.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // シャドーイングケース: 同名変数が複数スコープに存在する場合、呼び出し地点に最も近い内側スコープの値のみを取得できるか検証
  test('tracks shadowed variable argument', async () => {
    const expected = jsonData['tracks shadowed variable argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/object_shadow.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // Feature 1 (ケース1.5): obj.prop 形式の引数 — オブジェクト変数を追跡してプロパティ値の型を取得できるか検証
  // e.g. myLib(config.rate) where config = { rate: 0.5, timeout: 100 } → argTypes: [['number']]
  test('tracks obj.prop argument', async () => {
    const expected = jsonData['tracks obj.prop argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/obj_prop_access.js');
    const result = await analyzeArgAndMethod(file, 'myLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });

  // Feature 3: Object.assign 引数 — 第1引数リテラルからキーを抽出して object:{key,...} 型を返せるか検証
  // e.g. sortLib(opts) where opts = Object.assign({ locale: 'ja', numeric: true }, ...) → argTypes: [['object:{locale,numeric}']]
  test('tracks Object.assign argument', async () => {
    const expected = jsonData['tracks Object.assign argument'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/object_assign.js');
    const result = await analyzeArgAndMethod(file, 'sortLib', rev_groupedDependencies);
    expect(normalizeResults(result)).toEqual(expected);
  });
});