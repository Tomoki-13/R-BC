// object_via_variable.js
// 変数にオブジェクトを代入してから引数に渡すケース
const { sortLib } = require('./somelib');

const opts = { locale: 'ja', numeric: true };
sortLib(opts);
