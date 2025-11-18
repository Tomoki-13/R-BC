export {};
// 足し算の関数
function add(a: number, b: number): number {
    return a + b;
}

// 引き算の関数
function subtract(a: number, b: number): number {
    return a - b;
}

// 掛け算の関数
function multiply(a: number, b: number): number {
    return a * b;
}

// 割り算の関数
function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

//使用している関数: add, multiply
function addToMultiply(a: number, b: number, c: number): number {
    const sum = add(a, b); 
    return multiply(sum, c);
}

//使用している関数: subtract, divide
function subtractAndDivide(a: number, b: number, c: number): number {
    // 使用している関数: subtract, divide
    const difference = subtract(a, b); 
    return divide(difference, c); 
}

//使用している関数: addToMultiply, subtractAndDivide
function calcFinalResult(a: number, b: number, c: number, d: number): number {
    const multiplicationResult = addToMultiply(a, b, c);
    const divisionResult = subtractAndDivide(multiplicationResult, b, d);
    return divisionResult;
}