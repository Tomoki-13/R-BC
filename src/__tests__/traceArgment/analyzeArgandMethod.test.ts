import fs from 'fs';
import path from 'path';

import { analyzeArgAndMethod } from '../../astRelated/analyzer/analyzeArgandMethod';
import { getAllFiles } from '../../utils/getAllFiles';
import { getFileRelated } from '../../astRelated/trace/getFileRelated';
import { OutboundFileDependencies, InboundFunctionDependencies } from '../../types/FileDependencies';
import { reverseDependencies } from '../../astRelated/trace/reverseDependencies';

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
    expect(await analyzeArgAndMethod(file, 'roop_divide', rev_groupedDependencies)).toEqual(expected);
  });

  test('tracks variable arguments defined within the same file', async () => {
    const expected = jsonData['tracks variable arguments defined within the same file'];
    const file = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/main.js');
    expect(await analyzeArgAndMethod(file, 'roop_divide', rev_groupedDependencies)).toEqual(expected);
  });

  test('tracks variable arguments from an external file', async () => {
    const { division, logger_wrapper } = jsonData['tracks variable arguments from an external file'];
    const divisionFile = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/division.js');
    const loggerFile = path.resolve(__dirname, '../inputFiles/analyzeArgAndMethod/logger_wrapper.js');
    expect(await analyzeArgAndMethod(divisionFile, 'divide', rev_groupedDependencies)).toEqual(division);
    expect(await analyzeArgAndMethod(loggerFile, 'logger', rev_groupedDependencies)).toEqual(logger_wrapper);
  });
});
