# rbc-executor

`createPattern` が出力したパターンを2つの npm バージョンで実際に実行し、  
後方互換性破壊（Breaking Change）を確認する独立した実行機。

## 構成

```
executor/
├── src/
│   ├── index.ts          # エントリポイント（INPUT セクションで設定）
│   ├── patternToScript.ts # パターン → Node.js スクリプト変換
│   ├── runner.ts          # sandbox でスクリプトを実行
│   ├── versionManager.ts  # sandbox に指定バージョンをインストール
│   └── types.ts           # 型定義
├── sandbox/               # テスト用隔離環境（package.json だけ管理）
│   └── package.json       # 実行ごとに書き換えられる
├── output/                # 実行結果 JSON の出力先
└── package.json           # 独立した package（親プロジェクトとは別）
```

## 実行方法

```bash
cd executor
npm install          # 初回のみ
npm start
```

## 設定（src/index.ts の INPUT セクション）

```typescript
const config: ExecutorConfig = {
  libName: 'uuid',           // ライブラリ名
  preVersion: '3.4.0',       // 破壊前のバージョン（pre で pass が前提）
  postVersion: '7.0.0-beta.0', // 破壊後のバージョン
  patternPath: path.resolve(__dirname, '../../output/.../failure_rawpattern.json'),
  patternFormat: 'rawpattern', // 'rawpattern' | 'patternList'
  splitMode: 1,                // 0: 切り分けなし  1: import 変数単位に細分化
};
```

### patternFormat

| 値 | ファイル | 説明 |
|----|---------|------|
| `rawpattern` | `failure_rawpattern.json` | `---N` プレースホルダー形式（推奨） |
| `patternList` | `failure_patternList.json` | 正規表現形式（レガシー・精度低） |

### splitMode

| 値 | 動作 | ラベル例 |
|----|------|---------|
| `0` | 1ファイルグループ = 1スクリプト（現状維持） | `cozy-konnector-libs` |
| `1` | import 変数ごとに細分化（取りこぼし防止） | `cozy-konnector-libs/uuid/lib/sha1` |

**mode 1 が有効なケース**: 1つのファイルに複数の異なる import がある場合。  
mode 0 だと最初に失敗した import で処理が止まり、残りの import の破壊的変更が隠れてしまう。  
mode 1 では各 import を独立してテストするため、全ての破壊的変更を個別に検出できる。

```
# mode 0: cozy-konnector-libs → 1件 (sha1 が失敗した時点で終了)
# mode 1: cozy-konnector-libs/uuid/v5          → pass
#         cozy-konnector-libs/uuid/lib/sha1     → ✓ breaking
#         cozy-konnector-libs/uuid/lib/bytesToUuid → ✓ breaking
```

## パターン形式と変換ルール（rawpattern）

`FunctionCallCode` に含まれる `---N`（N は数字）が変数プレースホルダー。

| FunctionCallCode | 生成コード |
|-----------------|-----------|
| `import ---1 from 'lib'` | `const _lib1 = require('lib');` |
| `import { v4 as ---1 } from 'lib'` | `const _lib1 = require('lib').v4;` |
| `---1 = require('lib')` | `const _lib1 = require('lib');` |
| `---1 = require('lib').sync` | `const _lib1 = require('lib').sync;` |
| `---1.v4(...)` | `if (typeof _lib1.v4 !== 'function') throw ...` |
| `---1(...)` | `if (typeof _lib1 !== 'function') throw ...` |

### 検出できる破壊的変更

- **サブパスの削除**: `require('uuid/v4')` が MODULE_NOT_FOUND になる
- **デフォルトエクスポートの型変更**: v3 の `require('uuid')` は関数、v7 以降はオブジェクト
- **内部パスの削除**: `require('uuid/lib/sha1')` など

## 実行フロー

1. パターンファイルを読み込み、スクリプトを一括生成
2. pre バージョンをインストール → 全スクリプトを実行
3. post バージョンをインストール → 全スクリプトを実行
4. `pre=pass` かつ `post=fail` のパターンを **confirmed breaking** と判定

インストールは各バージョン1回のみ（パターン数によらず計2回）。

## 出力

`output/<libName>_<pre>_<post>_split<N>_execution.json`:

```json
{
  "libName": "uuid",
  "preVersion": "3.4.0",
  "postVersion": "7.0.0-beta.0",
  "totalPatterns": 75,
  "confirmedBreaking": 24,
  "results": [
    {
      "patternIndex": 0,
      "label": "Channels",
      "script": "...",
      "pre": { "passed": true },
      "post": { "passed": true },
      "isConfirmedBreaking": false
    },
    ...
  ]
}
```

## 注意事項

- `sandbox/node_modules/` は `.gitignore` に含まれる
- `sandbox/package.json` はバージョン切り替えのたびに上書きされる
- スクリプトはタイムアウト 10 秒で強制終了される
