// object_shadow.js
// 同名変数のシャドーイングケース: sortLib に渡される opts は内側スコープのもの
// 外側スコープの { outer: true } ではなく内側の { inner: false, locale: 'ja' } が取得されることを検証する
const { sortLib } = require('./somelib');

const opts = { outer: true };  // 外側スコープ（内側の opts にシャドーイングされる）

function inner() {
  const opts = { inner: false, locale: 'ja' };  // 内側スコープ（こちらが正解）
  sortLib(opts);
}
