// computed_key.js
// computed key を含むオブジェクトのキー抽出を検証
// [Symbol.iterator] / ['stringKey'] 形式のキーも取得できるか
const { myLib } = require('./somelib');

myLib({
  normal: 1,
  [Symbol.iterator]: function* () {},
  ['aliased']: true,
});
