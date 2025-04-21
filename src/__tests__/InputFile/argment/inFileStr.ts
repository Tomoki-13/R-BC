export {};
function combine(a:string, b:string) {
    return a + b;
}
let str1 = "Hello";
let str2 = "World";
let result1 = combine(str1, str2);
str1 += "!";
let result2 = combine(str1, str2);
