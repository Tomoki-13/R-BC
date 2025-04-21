export {};
function sum(a: number, b: number): number {
    return a + b;
}

function subtract(a: number, b: number): number {
    return a - b;
}

// addを使用
function addNumbers(a: number, b: number): number {
    return sum(a, b);
}

// subtractを使用
function adjustWithSubtraction(a: number, b: number): number {
    let sub = subtract(a, b);
    return sub;
}

// add,subtractを使用
function combinedCalculation(a: number, b: number, c: number): number {
    const sum1 = sum(a, b);
    const diff = subtract(sum1, c);
    return diff;
}
