// object_assign.js
// Object.assign を使ったオブジェクト生成ケース
// 第1引数のリテラルからキーを抽出して object:{key,...} 型を返せるか検証
const { sortLib } = require('./somelib');

const opts = Object.assign({ locale: 'ja', numeric: true }, { extra: 'ok' });
sortLib(opts);
