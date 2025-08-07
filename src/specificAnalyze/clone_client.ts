import fs from "fs";
import path from "path";
import { specificCommit } from "../types/specificCommit";
import { getAllFilesRecursively } from "../utils/getAllFiles";
import { cloneRepoWithCommit } from "../utils/cloneRepoWithCommit";
import output_json from "../utils/output_json";

async function clone() {
    let data_path = path.resolve(process.cwd(), '../../datasets/input/2025-07-29-02-39-07-success/specificCommit');
    // console.log("data_path", data_path);
    const data_files :string[]= await getAllFilesRecursively(data_path);
    for(let i = 0; i < data_files.length; i++) {
        const data:specificCommit[] = JSON.parse(fs.readFileSync(data_files[i], 'utf-8'));
        const fileNameWithExt = data_files[i].split('/').pop() || '';
        const fileNameWithoutExt = fileNameWithExt.replace(/\.[^/.]+$/, '');
        let output_path = path.resolve(process.cwd(), '../../allupdateSuccessClient/' + fileNameWithoutExt);
        output_json.createOutputDirectory(output_path);
        let count = 0;
        for(const element of data) {
            let repo:string|null = await cloneRepoWithCommit(element.client, output_path, element.commit);
            if(repo?.length) {
                count++;
            }
        };
        console.log(`クローン完了: リポジトリ数${data.length} - 成功数: ${count}`);
    }
}
clone()