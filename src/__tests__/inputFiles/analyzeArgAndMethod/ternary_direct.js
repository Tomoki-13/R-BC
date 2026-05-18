// ternary_direct.js
// 三項演算子が引数に直接渡されるケース（ケース4）
// then/else 両ブランチの型を取得できるか検証
const { myLib } = require('./somelib');

const flag = true;
myLib(flag ? 42 : 'fallback');
