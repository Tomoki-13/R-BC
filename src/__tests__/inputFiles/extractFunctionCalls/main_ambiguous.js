const { roop_divide } = require("./division");

let a = 81;
let b = 3;

// 条件によって 'a' が文字列になる可能性がある
if (new Date().getSeconds() % 2 === 0) {
    a = "this is not a number";
}

// roop_divide を呼び出す。このとき 'a' は number か string
console.log(roop_divide(a, b));