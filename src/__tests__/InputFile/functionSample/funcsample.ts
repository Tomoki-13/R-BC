import { FuncA,FuncB } from './FuncA';
export const sum = (a: number, b: number): number => {
    return a + b;
};

function subtract(a: number, b: number): number {
    return a - b;
}

function Hello(): void {
    console.log("Hello!");
}
let a:number = 2;
let b:number = 3;
let c:number = 4;
const result1:number = sum(a,b);
const result2:number = sum(b,c);
Hello();
//
const num:number = subtract(5,3);
console.log(FuncA.greet('World'));
console.log(FuncA.add(2, 3));
console.log(FuncB.div(4, 2));