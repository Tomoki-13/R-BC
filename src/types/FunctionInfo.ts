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