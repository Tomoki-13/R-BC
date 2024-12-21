import fs from "fs";
import { MatchClientPattern } from "../types/outputTypes";
//比較関数
const compareClients = (
    data1: MatchClientPattern[],
    data2: MatchClientPattern[]
): { onlyInData1: string[]; onlyInData2: string[] } => {
    const clients1 = data1.map(item => item.client);
    const clients2 = data2.map(item => item.client);

    const onlyInData1 = clients1.filter(client => !clients2.includes(client));
    const onlyInData2 = clients2.filter(client => !clients1.includes(client));

    return { onlyInData1, onlyInData2 };
}
//jsonの読み出し
const loadJsonData = (filePath: string): MatchClientPattern[] => {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonData) as MatchClientPattern[];
};

//比較したいファイルのJSONファイルのパス
const data1Path = '';
const data2Path = '';
const data1 = loadJsonData(data1Path);
const data2 = loadJsonData(data2Path);

const result = compareClients(data1, data2);
console.log("Only in Data1:", result.onlyInData1);
console.log("Only in Data2:", result.onlyInData2);