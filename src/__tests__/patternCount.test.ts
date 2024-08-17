import { countPatterns } from '../patternOperations/patternCount';

describe('countPatterns',()=>{
    it('count pattern',()=>{
        const input=[[["a"],["a"]],[["b"],["b"]],[["a"],["a"]],[["a"],["a"]]];
        const expectedOutput=[{pattern:[["a"],["a"]],count:3},{pattern:[["b"],["b"]],count:1}];
        const result=countPatterns(input);
        expect(result).toEqual(expectedOutput);
    });

    it('return an empty array',()=>{
        const input:string[][][]=[];
        const expectedOutput:{pattern:string[][],count:number}[]=[];
        const result=countPatterns(input);
        expect(result).toEqual(expectedOutput);
    });

    it('Counting when there is more than one element',()=>{
        const input=[[["a"],["b"]],[["a","b"]],[["a","b"]],[["a"],["b"]]];
        const expectedOutput=[{pattern:[["a"],["b"]],count:2},{pattern:[["a","b"]],count:2}];
        const result=countPatterns(input);
        expect(result).toEqual(expectedOutput);
    });
});