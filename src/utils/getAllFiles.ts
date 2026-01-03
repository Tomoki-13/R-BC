import fs from 'fs/promises';
import path from 'path';

// 開発者が書く可能性のあるソース拡張子
const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.cjs',
  '.mjs',
]);

// ビルド成果物・生成物によくある suffix
const EXCLUDED_SUFFIXES = [
  '.min.js',
  '.dev.js',
  '.lib.js',
  '.lib.ts',
  '.bundle.js',
];

// 明示的に除外するファイル名
const EXCLUDED_FILENAMES = new Set([
  '.DS_Store',
]);

// 解析対象外ディレクトリ
const EXCLUDED_DIRECTORIES = [
  'node_modules',
  'dist',
  'build',
  'out',
];

// 非同期でディレクトリ内のすべての js / ts / jsx / tsx ファイルを再帰的に取得する関数
export const getAllFiles = async (directoryPath: string): Promise<string[]> => {
  const allFiles: string[] = [];
  try {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(directoryPath, file.name);
      if (file.isFile()) {
        if (isAnalyzableSourceFile(filePath)) {
          allFiles.push(filePath);
        }
      } else if (file.isDirectory()) {
        if (!isExcludedDirectory(filePath)) {
          const subFiles = await getAllFiles(filePath);
          allFiles.push(...subFiles);
        }
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
    throw err;
  }

  return allFiles;
};

// 再帰的にすべてのファイルを取得する関数（フィルタなし）
export const getAllFilesRecursively = async (targetPath: string): Promise<string[]> => {
  const results: string[] = [];
  const stats = await fs.stat(targetPath);
  if (stats.isFile()) {
    return [targetPath];
  }
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;

    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await getAllFilesRecursively(fullPath);
      results.push(...nestedFiles);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
};

const isAnalyzableSourceFile = (filePath: string): boolean => {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);

  if (!SOURCE_EXTENSIONS.has(ext)) {
    return false;
  }

  if (EXCLUDED_SUFFIXES.some((suffix) => fileName.endsWith(suffix))) {
    return false;
  }

  if (EXCLUDED_FILENAMES.has(fileName)) {
    return false;
  }

  return true;
};

const isExcludedDirectory = (dirPath: string): boolean => {
  return EXCLUDED_DIRECTORIES.some((dir) => dirPath.includes(dir));
};
