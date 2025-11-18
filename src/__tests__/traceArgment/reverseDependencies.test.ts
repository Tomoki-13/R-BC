import { reverseDependencies } from '../../astRelated/traceArg/reverseDependencies';
import { OutboundFileDependencies, InboundFunctionDependencies } from '../../types/FileDependencies';

describe('reverseDependencies.ts test', () => {
  test('basic reverse mapping', () => {
    const fileDeps: OutboundFileDependencies[] = [
      {
        filepath: 'A.ts',
        dependence: [
          {
            dep_filepath: 'B.ts',
            functions: ['func1', 'func2'],
          },
          {
            dep_filepath: 'C.ts',
            functions: ['func3'],
          },
        ],
      },
      {
        filepath: 'D.ts',
        dependence: [
          {
            dep_filepath: 'B.ts',
            functions: ['func1'],
          },
        ],
      },
    ];

    const expected: InboundFunctionDependencies[] = [
      {
        funcNameInFilepath: 'func1',
        filepath: 'B.ts',
        dependence: [
          {
            dep_filepath: 'A.ts',
            functions: ['func1'],
          },
          {
            dep_filepath: 'D.ts',
            functions: ['func1'],
          },
        ],
      },
      {
        funcNameInFilepath: 'func2',
        filepath: 'B.ts',
        dependence: [
          {
            dep_filepath: 'A.ts',
            functions: ['func2'],
          },
        ],
      },
      {
        funcNameInFilepath: 'func3',
        filepath: 'C.ts',
        dependence: [
          {
            dep_filepath: 'A.ts',
            functions: ['func3'],
          },
        ],
      },
    ];

    const result = reverseDependencies(fileDeps);
    const sortedResult = result.sort((a, b) => a.funcNameInFilepath.localeCompare(b.funcNameInFilepath));
    const sortedExpected = expected.sort((a, b) => a.funcNameInFilepath.localeCompare(b.funcNameInFilepath));

    expect(sortedResult).toEqual(sortedExpected);
  });
});