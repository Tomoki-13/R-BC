import { promises as fsPromises } from 'fs';
const parser = require("@babel/parser");
import path from 'path';
import fs from 'fs';
import output_json from "../utils/output_json";

(async () => {
    const filePath = '../__tests__/InputFile/argment/inFileSample1.ts';
    const fileContent: string = await fsPromises.readFile(filePath, 'utf8');
    const parsed = parser.parse(fileContent, { sourceType: 'unambiguous', 
        plugins: [
            'typescript',
            'jsx',
            'decorators-legacy',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            'optionalChaining',
            'nullishCoalescingOperator'
        ]});
    const outputDirectory = path.resolve(__dirname, './output');
    output_json.createOutputDirectory(outputDirectory);
    fs.writeFileSync(output_json.getUniqueOutputPath(outputDirectory,'astData','JSON'), JSON.stringify(parsed,null,2));
})();