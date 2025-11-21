export interface FunctionInfo {
    name: string;
    args: string[];
    isExported: boolean;
    start: number;
    end: number;
}
export interface ExportFunctionInfo {
    name: string;
    args: string[];
}
export interface module_export_prperty {
    prperty_name:string,//module.exportsのプロパティ名
    right_func:string   //右辺で定義される関数
}

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

export interface ModuleExportProperty {
  property_name: string;
  right_func: string;
}