//関数のメタ情報
export interface FunctionMetaInfo {
  name: string;
  isExported: boolean;
  arg: string[];
  filePath: string;
  start: number | null | undefined;
  end: number | null | undefined;
}
//関数の範囲情報
export interface FunctionInfo_funcRange {
  funcname: string;
  arg: string[];
  filePath: string;
  start: number | null | undefined;
  end: number | null | undefined;
}
