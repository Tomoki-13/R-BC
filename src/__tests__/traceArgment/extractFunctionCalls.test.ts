import fs from 'fs';
import path from 'path';

import { extractFunctionCalls } from '../../astRelated/traceArg/extractFunctionCalls';
import { getAllFiles } from '../../utils/getAllFiles';
import { getFileRelated } from '../../astRelated/traceArg/getFileRelated';
import { OutboundFileDependencies, InboundFunctionDependencies } from '../../types/FileDependencies';
import { reverseDependencies } from '../../astRelated/traceArg/reverseDependencies';

describe('extractFunctionCalls test', () => {
  const filePath = path.resolve(__dirname, '../outputFiles/extractFunctionCallsData.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let allFiles: string[];
  let groupedDependencies: OutboundFileDependencies[];
  let rev_groupedDependencies: InboundFunctionDependencies[];

  beforeAll(async () => {
    const inputPath = path.resolve(__dirname, '../inputFiles/extractFunctionCalls');
    allFiles = await getAllFiles(inputPath);
    groupedDependencies = getFileRelated(allFiles);
    rev_groupedDependencies = reverseDependencies(groupedDependencies);
  });

  test('tracks constant arguments within the same file', async () => {
    const expected = jsonData['tracks constant arguments within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/extractFunctionCalls/constant.js');
    expect(expected).toEqual(await extractFunctionCalls(file, 'roop_divide', rev_groupedDependencies));
  });

  test('tracks variable arguments defined within the same file', async () => {
    const expected = jsonData['tracks variable arguments defined within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/extractFunctionCalls/main.js');
    expect(expected).toEqual(await extractFunctionCalls(file, 'roop_divide', rev_groupedDependencies));
  });

  test('tracks variable arguments from an external file', async () => {
    const { division, logger_wrapper } = jsonData['tracks variable arguments from an external file'];
    const divisionFile = path.resolve(__dirname, '../inputFiles/extractFunctionCalls/division.js');
    const loggerFile = path.resolve(__dirname, '../inputFiles/extractFunctionCalls/logger_wrapper.js');
    expect(division).toEqual(await extractFunctionCalls(divisionFile, 'divide', rev_groupedDependencies));
    expect(logger_wrapper).toEqual(await extractFunctionCalls(loggerFile, 'logger', rev_groupedDependencies));
  });
});
