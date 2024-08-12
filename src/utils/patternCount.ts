//重複カウント
export function countPatterns(pattern: string[][][]): { pattern: string[][], count: number }[] {
    const patternMap = new Map<string, number>();
    pattern.forEach(subrespattern => {
        const patternString = JSON.stringify(subrespattern);
        if (patternMap.has(patternString)) {
            patternMap.set(patternString, patternMap.get(patternString)! + 1);
        } else {
            patternMap.set(patternString, 1);
        }
    });

    return Array.from(patternMap.entries()).map(([patternString, count]) => {
        const pattern = JSON.parse(patternString);
        return { pattern, count };
    });
}
