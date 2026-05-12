// object_wrapper.js
// 外部から受け取った config を sortLib にそのまま渡すラッパー関数
// object_provider.js からオブジェクトリテラルが渡されることを想定
const { sortLib } = require('./somelib');

function wrapSort(config) {
  sortLib(config);
}

module.exports = { wrapSort };
