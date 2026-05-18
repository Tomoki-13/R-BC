// ternary_via_variable.js
// 変数に三項演算子で代入してから引数に渡すケース（ケース1）
// 変数追跡 + 三項展開の組み合わせを検証
const { myLib } = require('./somelib');

const val = process.env.DEBUG ? { debug: true } : 'noop';
myLib(val);
