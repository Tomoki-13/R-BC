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