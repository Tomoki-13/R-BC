export type ExtractFunctionCallsResult = {
  FunctionCallCode: string; // 関数呼び出しコード
  argTypes: string[][]; // 各関数呼び出しごとに引数の型群
  argContexts: string[][]; // 各関数呼び出しごとの、引数ごとのコードスニペット群
};
