import { patternMatch } from "../patternOperations/patternMatch";
import patternConversion from "../patternOperations/patternConversion";
describe('patternMatch test', () => {
    test('Basic usage', async () => {
        const userpatterns: string[][] = [
            ["import ---1 from 'module1'", "---1()"],
        ];
        let search_patterns:string[][][] = [
            [["import ---1 from 'module1'", "---1()"]]
        ];
        search_patterns = patternConversion.abstStr(search_patterns);
        const expectedOutput: boolean = true;
        const [isMatch]: [boolean, string[][] | null] = await patternMatch(userpatterns, search_patterns);
        expect(isMatch).toEqual(expectedOutput);
    });
    test('false usage', async () => {
        const userpatterns: string[][] = [
            [ "import ---1 from 'module1'"]
        ];
        let search_patterns: string[][][] = [
            [["import ---1 from 'module1'", "---1()"]],
        ];
        search_patterns = patternConversion.abstStr(search_patterns);
        const expectedOutput: boolean = false;
        const [isMatch]: [boolean, string[][] | null] = await patternMatch(userpatterns, search_patterns);
        expect(isMatch).toEqual(expectedOutput);
        
        const userpatterns2: string[][] = [
            ["import ---1 from 'module1'", "---1()"]
        ];
        let search_patterns2: string[][][] = [
            [["import ---2 from 'module2'", "---2()", "import ---3 from 'module1'"]],
        ];
        search_patterns2 = patternConversion.abstStr(search_patterns2);
        const expectedOutput2: boolean = false;
        const [isMatch2]: [boolean, string[][] | null] = await patternMatch(userpatterns2, search_patterns2);
        expect(isMatch2).toEqual(expectedOutput2);
    });
    test('require usage', async () => {
        const userpatterns: string[][] = [
            [ "var ---2 = require('module');'"]
        ];
        let search_patterns: string[][][] = [
            [["var ---2 = require('module');"]],
        ];
        search_patterns = patternConversion.abstStr(search_patterns);
        const expectedOutput: boolean = true;
        const [isMatch]: [boolean, string[][] | null] = await patternMatch(userpatterns, search_patterns);
        expect(isMatch).toEqual(expectedOutput);
        
        const userpatterns2: string[][] = [
            ["import ---1 from 'module1'", "---1()"]
        ];
        let search_patterns2: string[][][] = [
            [["import ---2 from 'module2'", "---2()", "import ---3 from 'module1'"]],
        ];
        search_patterns2 = patternConversion.abstStr(search_patterns2);
        const expectedOutput2: boolean = false;
        const [isMatch2]: [boolean, string[][] | null] = await patternMatch(userpatterns2, search_patterns2);
        expect(isMatch2).toEqual(expectedOutput2);
    });
});
describe('confirm test', () => {
    test('intero', async () => {
        const userpatterns: string[][] = [
            ["var ---2 = require('module');",'var ---1 = _interopRequireDefault(---2);','---1()'],
            [ "import ---3 from 'module';", '---3()' ]]
        ;
        let search_patterns: string[][][] = [
            [
                ["var ---2 = require('module');",'var ---1 = _interopRequireDefault(---2);','---1()'],
            ]
        ];
        search_patterns = patternConversion.abstStr(search_patterns);
        const expectedOutput: boolean = true;
        const [isMatch]: [boolean, string[][] | null] = await patternMatch(userpatterns, search_patterns);
        expect(isMatch).toEqual(expectedOutput);
    });
});