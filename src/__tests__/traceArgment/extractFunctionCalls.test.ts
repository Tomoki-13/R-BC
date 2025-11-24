import fs from 'fs';
import path from 'path';

import { extractFunctionCallsArgument } from '../../astRelated/analyzer/extractFunctionCallsArgument';
import { getAllFiles } from '../../utils/getAllFiles';
import { getFileRelated } from '../../astRelated/trace/getFileRelated';
import { OutboundFileDependencies, InboundFunctionDependencies } from '../../types/FileDependencies';
import { reverseDependencies } from '../../astRelated/trace/reverseDependencies';

describe('extractFunctionCallsArgument test', () => {
  const filePath = path.resolve(__dirname, '../outputFiles/extractFunctionCallsArgument.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let allFiles: string[];
  let groupedDependencies: OutboundFileDependencies[];
  let rev_groupedDependencies: InboundFunctionDependencies[];

  beforeAll(async () => {
    const inputPath = path.resolve(__dirname, '../inputFiles/extractFunctionCallsArgument');
    allFiles = await getAllFiles(inputPath);
    groupedDependencies = getFileRelated(allFiles);
    rev_groupedDependencies = reverseDependencies(groupedDependencies);
  });

  test('tracks constant arguments within the same file', async () => {
    const expected = jsonData['tracks constant arguments within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/extractFunctionCallsArgument/constant.js');
    expect(expected).toEqual(await extractFunctionCallsArgument(file, 'roop_divide', rev_groupedDependencies));
  });

  test('tracks variable arguments defined within the same file', async () => {
    const expected = jsonData['tracks variable arguments defined within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/extractFunctionCallsArgument/main.js');
    expect(expected).toEqual(await extractFunctionCallsArgument(file, 'roop_divide', rev_groupedDependencies));
  });

  test('tracks variable arguments from an external file', async () => {
    const { division, logger_wrapper } = jsonData['tracks variable arguments from an external file'];
    const divisionFile = path.resolve(__dirname, '../inputFiles/extractFunctionCallsArgument/division.js');
    const loggerFile = path.resolve(__dirname, '../inputFiles/extractFunctionCallsArgument/logger_wrapper.js');
    expect(division).toEqual(await extractFunctionCallsArgument(divisionFile, 'divide', rev_groupedDependencies));
    expect(logger_wrapper).toEqual(await extractFunctionCallsArgument(loggerFile, 'logger', rev_groupedDependencies));
  });
});
