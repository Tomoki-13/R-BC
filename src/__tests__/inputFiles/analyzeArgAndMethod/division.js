// division.js
function divide(a, b) {
  return a / b;
}

function roop_divide(a, b) {
    if (b === 0) {
        throw new Error("0で割ることはできません。");
    }
    while(a % b !== 0) {
        a = divide(a, b)
    }
    return a;
}

// 他のファイルから使えるようにエクスポート
module.exports = { roop_divide };