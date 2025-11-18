export namespace FuncA {
    export function greet(name: string): string {
        return `Hello, ${name}!`;
    }

    export function add(a: number, b: number): number {
        return a + b;
    }
}

export namespace FuncB {
    export function div(num1:number,num2:number): number {
        return num1/num2;
    }
}
