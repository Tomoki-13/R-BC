// computed_key_via_variable.js
// ケース1（変数追跡）× computed key: 変数経由のオブジェクトに computed key が含まれる場合
// rangeArg → 文字列ヒューリスティック（extractKeysFromObjectCode）パスで
// [Symbol.xxx] / ['stringKey'] を抽出できるか検証
const { myLib } = require('./somelib');

const opts = { [Symbol.iterator]: function() {}, ['alias']: true, normal: 1 };
myLib(opts);
