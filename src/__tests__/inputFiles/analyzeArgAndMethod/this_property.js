// this_property.js
// クラスのコンストラクタで this.xxx にオブジェクトを代入し、メソッド内で引数として渡すケース
const { sortLib } = require('./somelib');

class Sorter {
  constructor() {
    this.options = { caseFirst: false, collation: 'base' };
  }

  run() {
    sortLib(this.options);
  }
}
