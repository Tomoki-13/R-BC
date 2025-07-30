import { promises as fsPromises, Dirent } from 'fs';
import * as path from 'path';

//クライアントごとの調査対象ファイルを取得
export const getSubDir = async(directoryPath: string): Promise<string[]> => {
    try {
        const allSubDirs: string[] = [];
        const allSecSubDirs: string[] = [];
        const dirs: Dirent[] = await fsPromises.readdir(directoryPath, { withFileTypes: true });
        for (const dir of dirs) {
            if (dir.name !== ".DS_Store" && dir.isDirectory()) {
                const subDirPath: string = path.join(directoryPath, dir.name);
                allSubDirs.push(subDirPath);
            }
        }
        for (const subDirPath of allSubDirs) {
            const subdirs: Dirent[] = await fsPromises.readdir(subDirPath, { withFileTypes: true });
            for (const subdir of subdirs) {
                if (subdir.name !== ".DS_Store" && subdir.isDirectory()) {
                    const secSubDirPath: string = path.join(subDirPath, subdir.name);
                    allSecSubDirs.push(secSubDirPath);
                }
            }
        }
        return allSecSubDirs;
    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}