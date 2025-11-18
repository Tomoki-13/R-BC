import { getFileRelated } from '../../astRelated/traceArg/getFileRelated';
import { getImportAndPath } from '../../utils/getImportAndPath';
import { CallModuleAndFuncList } from '../../types/ModuleList';
import { OutboundFileDependencies } from '../../types/FileDependencies';

jest.mock('../../utils/getImportAndPath', () => ({
  getImportAndPath: jest.fn(),
}));

// 'path' モジュールをモックし、OS非依存の posix (/) セパレータ
jest.mock('path', () => {
  const posixPath = jest.requireActual('path').posix;
  return {
    ...jest.requireActual('path'),
    resolve: (...args: string[]) => posixPath.resolve(...args),
    dirname: (p: string) => posixPath.dirname(p),
  };
});

const mocked_getImportAndPath = getImportAndPath as jest.Mock;

describe('getFileRelated', () => {
  beforeEach(() => {
    mocked_getImportAndPath.mockClear();
  });

  it('基本的な依存関係を正しくグループ化する', () => {
    const allFiles = ['/app/src/fileA.ts', '/app/src/fileB.ts'];

    const mockData: CallModuleAndFuncList[] = [
      { code: 'func1()', call_modulename: './fileB', funcname: 'func1', path: '/app/src/fileA.ts' },
      { code: 'func2(a)', call_modulename: './fileB', funcname: 'func2', path: '/app/src/fileA.ts' },
    ];
    mocked_getImportAndPath.mockReturnValueOnce(mockData);
    mocked_getImportAndPath.mockReturnValueOnce([]);

    const result = getFileRelated(allFiles);

    const expected: OutboundFileDependencies[] = [
      {
        filepath: '/app/src/fileA.ts',
        dependence: [
          {
            dep_filepath: '/app/src/fileB',
            functions: ['func1', 'func2'], // sort() により順序が保証される
          },
        ],
      },
    ];
    expect(result).toEqual(expected);
  });

  it('ライブラリのインポート (相対パスでない) を除外する', () => {
    const allFiles = ['/app/src/component.tsx'];

    const mockData: CallModuleAndFuncList[] = [
      { code: 'useState(null)', call_modulename: 'react', funcname: 'useState', path: '/app/src/component.tsx' },
      { code: 'format(data)', call_modulename: './utils', funcname: 'format', path: '/app/src/component.tsx' },
    ];
    mocked_getImportAndPath.mockReturnValueOnce(mockData);

    const result = getFileRelated(allFiles);

    const expected: OutboundFileDependencies[] = [
      {
        filepath: '/app/src/component.tsx',
        dependence: [
          {
            dep_filepath: '/app/src/utils',
            functions: ['format'],
          },
        ],
      },
    ];
    expect(result).toEqual(expected);
  });

  it('サポート対象外のファイル拡張子を無視する', () => {
    const allFiles = ['/app/src/fileA.ts', '/app/README.md', '/app/package.json'];

    mocked_getImportAndPath.mockReturnValueOnce([
      { code: 'load()', call_modulename: './config', funcname: 'load', path: '/app/src/fileA.ts' },
    ]);

    const result = getFileRelated(allFiles);

    expect(mocked_getImportAndPath).toHaveBeenCalledTimes(1);
    expect(mocked_getImportAndPath).toHaveBeenCalledWith('/app/src/fileA.ts', 0);

    const expected: OutboundFileDependencies[] = [
      {
        filepath: '/app/src/fileA.ts',
        dependence: [
          {
            dep_filepath: '/app/src/config',
            functions: ['load'],
          },
        ],
      },
    ];
    expect(result).toEqual(expected);
  });

  it('依存関係がない場合は空の配列を返す', () => {
    const allFiles = ['/app/src/fileA.ts', '/app/src/fileB.ts'];

    mocked_getImportAndPath.mockReturnValue([]);

    const result = getFileRelated(allFiles);

    expect(result).toEqual([]);
    expect(mocked_getImportAndPath).toHaveBeenCalledTimes(2);
  });
});