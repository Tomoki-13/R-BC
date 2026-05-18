// ternary_prop_value.js
// ケース1.5 × 三項演算子: obj.prop の値が三項の場合
// extractPropertyValueFromObjectCode で取得した値を resolveToTypeContextPairs で展開できるか検証
// e.g. config.val where config = { val: flag ? 42 : 'fallback' } → ['number', 'string']
const { myLib } = require('./somelib');

const config = { val: process.env.DEBUG ? 42 : 'fallback', timeout: 1000 };
myLib(config.val);
