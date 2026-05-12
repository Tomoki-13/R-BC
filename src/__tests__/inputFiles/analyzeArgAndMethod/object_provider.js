// object_provider.js
// wrapSort にオブジェクトリテラルを渡す呼び出し元
// object_wrapper.js の wrapSort を経由して sortLib へ追跡されることを検証する
const { wrapSort } = require('./object_wrapper');

wrapSort({ locale: 'en', caseFirst: true });
