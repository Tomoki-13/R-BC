// ternary_this_property.js
// ケース2 × 三項演算子: this.property の代入値が三項の場合
// collectThisPropertyValues で取得した値を resolveToTypeContextPairs で展開できるか検証
// e.g. this.value = flag ? { mode: 'fast' } : 'default' → ['object:{mode}', 'string']
const { myLib } = require('./somelib');

class Handler {
  constructor(flag) {
    this.value = flag ? { mode: 'fast' } : 'default';
  }

  run() {
    myLib(this.value);
  }
}
