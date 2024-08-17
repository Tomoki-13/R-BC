import patternUtils from '../patternOperations/patternUtils'; // モジュールのパスを正確に指定してください

describe('sortRespattern', () => {
    it('sort by length', () => {
        const input = [[["a"], ["b"]],[["a"]],[["a"], ["b"], ["c"]]];
        const expected = [[["a"]],[["a"], ["b"]],[["a"], ["b"], ["c"]]];
        expect(patternUtils.sortRespattern(input)).toEqual(expected);
    });
});

describe('removeDuplicate', () => {
    it('remove duplicate patterns', () => {
        const input = [[["a"]],[["b"]],[["a"]],[["c"], ["d"]],[["b"]]
        ];
        const expected = [[["a"]],[["b"]],[["c"], ["d"]]];
        expect(patternUtils.removeDuplicate(input)).toEqual(expected);
    });
});

describe('removeCallOnly', () => {
    it('remove only the call', () => {
        const input = [[["import something"], ["require something"]],[["a"], ["b"]],[["a"]],[["c"], ["_interopRequireDefault something"]]];
        const expected = [[["a"], ["b"]],[["c"], ["_interopRequireDefault something"]]];
        expect(patternUtils.removeCallOnly(input)).toEqual(expected);
    });
});

describe('removecase', () => {
    it('remove duplicate elements and empty arrays', () => {
        const input = [
            [["a", "a"], ["b"]],[[]],[["c", "c"], ["d", "d"]],[["e", "e"]],[["f"]]];
        const expected = [[["a"], ["b"]],[["c"], ["d"]],[["e"]],[["f"]]];
        expect(patternUtils.removecase(input)).toEqual(expected);
    });
});

describe('removeSubpattern', () => {
    it('remove a specific pattern', () => {
        const tmppattern = [[["a"], ["b"]],[["c"], ["d"]],[["e"], ["f"]]];
        const subpattern = [["c"], ["d"]];
        const expected = [[["a"], ["b"]],[["e"], ["f"]]];
        expect(patternUtils.removeSubpattern(tmppattern, subpattern)).toEqual(expected);
    });
});

describe('alignNumbersInPattern', () => {
    it('align numbers within the pattern', () => {
        const subpattern = [["var1---1", "var2---1"],["var3---2", "var4---3"],["var3---5", "var4---7"]];
        const expected = {
            before: [["var1---1", "var2---1"],["var3---2", "var4---3"],["var3---5", "var4---7"]],
            after: [["var1---1", "var2---1"],["var3---2", "var4---3"],["var3---4", "var4---5"]]
        };
        expect(patternUtils.alignNumbersInPattern(subpattern)).toEqual(expected);
    });
});