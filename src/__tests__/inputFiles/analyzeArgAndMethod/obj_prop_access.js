// obj_prop_access.js
// obj.prop 形式の引数追跡: options.rate のようなケースで
// オブジェクト変数を追跡してプロパティ値の型を取得できるか検証
const { myLib } = require('./somelib');

const config = { rate: 0.5, timeout: 100 };
myLib(config.rate);
