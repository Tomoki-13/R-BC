import { typeAwarePatternMatch } from "../patternOperations/typeAwarePatternMatch"; // 適切なパスに変更してください
import { ExtractFunctionCallsResult } from "../types/ExtractFunctionCallsResult";

describe('typeAwarePatternMatch test', () => {
  // 共通で使用する検索パターン定義
  const targetPattern: ExtractFunctionCallsResult[][][] = [
    [
      [
        {
          FunctionCallCode: "(?<variable1>[\\w-]+) = require([\"'`]fs[\"'`])[^.]*",
          argTypes: [[]],
          argContexts: [[]]
        },
        {
          FunctionCallCode: "variable1([^,]*,[^,]*)[^.]*",
          argTypes: [['String'], ['String']],
          argContexts: [[]]
        }
      ]
    ]
  ];

  test('Should match when types align (Success Case)', async () => {
    // Case A: 成功パターン (型が一致)
    const userDataSuccess: ExtractFunctionCallsResult[] = [
      {
        FunctionCallCode: "const fs = require('fs')", 
        argTypes: [[]],
        argContexts: [[]]
      },
      {
        FunctionCallCode: "fs('file.txt', 'content')",
        argTypes: [['String'], ['String']], 
        argContexts: [[]]
      }
    ];

    const search_patterns = JSON.parse(JSON.stringify(targetPattern));
    
    const expectedOutput: boolean = true;
    const [isMatch, matchedPattern]: [boolean, ExtractFunctionCallsResult[][] | null] = await typeAwarePatternMatch(userDataSuccess, search_patterns);
    
    expect(isMatch).toEqual(expectedOutput);
    expect(matchedPattern).not.toBeNull();
  });

  test('Should NOT match when types differ (Fail Case)', async () => {
    // Case B: 失敗パターン (第2引数が Number で型不一致)
    const userDataFail: ExtractFunctionCallsResult[] = [
      {
        FunctionCallCode: "const fs = require('fs')",
        argTypes: [[]],
        argContexts: [[]]
      },
      {
        FunctionCallCode: "fs('file.txt', 12345)",
        argTypes: [['String'], ['Number']],
        argContexts: [[]]
      }
    ];

    const search_patterns = JSON.parse(JSON.stringify(targetPattern));

    const expectedOutput: boolean = false;
    const [isMatch, matchedPattern]: [boolean, ExtractFunctionCallsResult[][] | null] = await typeAwarePatternMatch(userDataFail, search_patterns);
    
    expect(isMatch).toEqual(expectedOutput);
    expect(matchedPattern).toBeNull();
  });
});