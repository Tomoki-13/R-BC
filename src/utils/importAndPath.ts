
import { ModuleList } from "../types/ModuleList";
import fs from 'fs';
export const importAndPath = (path:string): ModuleList[] => {
    const code = fs.readFileSync(path, 'utf8');
    let result:ModuleList[] = [];
    const importRegex = /from\s+['"`](.*?)['"`]/;
    const requireRegex = /require\(['"`](.*?)['"`]\)/;
    let lines = code.split('\n');
    lines.filter(line => line.length < 400);
    let importLines:string[] = lines.filter(line => /import|require/.test(line) && !/^\s*\/\//.test(line));
    //console.log( importLines);
    for (const line of importLines) {
        if (/import|require/.test(line) && !/^\s*\/\//.test(line)) {
            const importMatch = line.match(importRegex);
            if (importMatch&&importMatch[1].length>0) {
                result.push({ code: line.trim(), modulename: importMatch[1],path });
            } else {
                const requireMatch = line.match(requireRegex);
                if (requireMatch&&requireMatch[1].length>0) {
                    result.push({ code: line.trim(), modulename: requireMatch[1],path });
                }
            }
        }
    }
    //funcNameIdentifiers
    return result; 
}