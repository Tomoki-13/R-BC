// object_direct.js
// オブジェクトリテラルを直接引数に渡すケース
const { sortLib } = require('./somelib');

sortLib({ caseFirst: true, sensitivity: 'base' });
