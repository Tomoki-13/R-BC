# R-BC (Research Backward Compatibility)

ライブラリのバージョンアップに伴う後方互換性の破壊を静的解析で検出するツールです。
アップデート前後のクライアントリポジトリを自動クローンし、AST（抽象構文木）を用いて関数・メソッドの利用パターンを抽出・マッチングします。
「後方互換性の損失に影響を受けるリポジトリ」と「影響を受けないリポジトリ」の双方に対してパターンを照合することで、検出精度を評価できます。

---

## ⚠️ データ配置とリポジトリ構成について

本リポジトリは現在、**親ディレクトリ（メタリポ `BCPatternGen`）配下の共有ディレクトリ** を入出力先として参照する構成に再構成しています。

- 入力データ: `BCPatternGen/datasets/`, `BCPatternGen/clonedata/alldataset_clients/`
- 出力データ: `BCPatternGen/outputs/latest/R-BC/`

このため、**現在この R-BC を単体クローンしての実行はサポートされていません**（実行すると 1 つ上の階層にディレクトリを作成して動こうとし、ユーザの作業環境に影響を与える可能性があります）。

### 単体実行を行いたい場合

メタリポ統合前の安定版コミットをご利用ください:

```bash
git checkout 35657eca255e5202af998269a717fa6f7e90d954
```

このコミット時点では、R-BC ディレクトリ内に閉じて動作します。

### 今後の予定

単体実行への対応も予定しています。

## 前提条件

- Node.js (v16以上推奨)
- Git
- make

## 環境変数の設定

GitHubのAPI制限を回避するため、また非公開リポジトリをクローンするために Personal Access Token (PAT) を設定してください。

```bash
# プロジェクトルートに .env を作成（.env.sample を参考に）
GITHUB_TOKEN=your_github_token_here
```

---

## 実行手順（Makefile）

### Step 0. 初回セットアップ

```bash
make init    # npm install + datasets/test_result.json の取得
make setup   # alldataset_clients/ へのクライアントリポジトリのクローン・前処理
```

### Step 1. パターン抽出・検出

`datasets/targets.json` に記載されたライブラリ・バージョンペアを対象に実行します。

```bash
make call-f  # mode0: 関数呼び出しパターンのみでマッチング
make type-f  # mode1: 引数の型まで含めてマッチング
make obj-f   # mode2: 型 + object キーの部分集合でマッチング（最も厳密）
```

`datasets/test_result.json` の全ペアを対象にする場合は `-f` を `-a` に変えてください（例: `make obj-a`）。
`src/index.ts` 内の `INLINE_TARGETS` を使う場合は `-d` を使います（例: `make obj-d`）。

### Makefile コマンド一覧

| コマンド | 内容 |
|---------|------|
| `make init` | npm install + test_result.json の取得 |
| `make setup` | クライアントリポジトリのクローン・前処理 |
| `make call-f` | mode0 / targets.json |
| `make type-f` | mode1 / targets.json |
| `make obj-f` | mode2 / targets.json |
| `make call-d` | mode0 / INLINE_TARGETS（index.ts 内に直接記述） |
| `make type-d` | mode1 / INLINE_TARGETS |
| `make obj-d` | mode2 / INLINE_TARGETS |
| `make call-a` | mode0 / test_result.json 全件 |
| `make type-a` | mode1 / test_result.json 全件 |
| `make obj-a` | mode2 / test_result.json 全件 |

---

## 出力ファイル構成

出力はメタリポ配下の `../outputs/` に書かれます。
まず `history/`（実行ごとのアーカイブ）に書き込み、Makefile が `latest/`（毎回上書き）にコピーします。普段は `latest/` を参照します。

```text
outputs/
├── latest/R-BC/                          # 最新結果（毎回上書き、ClientFixTrace もここを参照）
│   ├── method/                           # mode0
│   ├── type-method/                      # mode1
│   └── type-method-object/               # mode2
│        ├── execution_summary_<RUN_ID>.csv          # 全ライブラリの集計CSV
│        └── {LibraryName}_{Version}/
│             ├── createPattern/
│             │    ├── failure_rawpattern.json            # 抽出された生パターン
│             │    ├── failure_patternList.json           # マッチング用正規表現パターン
│             │    └── failure_libFunctionCoverage.json   # ライブラリ関数のカバレッジ情報
│             └── detectByPattern/
│                  ├── failure_detect.json                # failure側の検出結果（サマリ）
│                  ├── failure_matchResults.json          # failure側のパターン別マッチ詳細
│                  ├── success_detect.json                # success側の検出結果（サマリ）
│                  ├── success_matchResults.json          # success側のパターン別マッチ詳細
│                  └── successcombine_preCount.json       # failure＋successの結果(重複許容)
│
└── history/R-BC/<mode>/<RUN_ID>/         # 実行ごとのアーカイブ（latest と同じ中身）
```

### 主要ファイルの内容

- **`failure_rawpattern.json`**: failure リポジトリから抽出した関数呼び出しパターン。`---N` 形式のプレースホルダと実際のコードスニペットを含む。
- **`failure_patternList.json`**: マッチングに使用する正規表現パターンのリスト。
- **`failure_detect.json` / `success_detect.json`**: 検出されたクライアント一覧、検出数、テスト有無などのサマリ。
- **`failure_matchResults.json` / `success_matchResults.json`**: どのクライアントのどのファイルでどのパターンが何回マッチしたかの詳細。
- **`execution_summary_*.csv`**: 全ライブラリ・バージョンペアの検出数を横断集計したCSV。

---

## 検出モードの違い

| mode | コマンド suffix | 内容 | 検出数の傾向 |
|------|---------------|------|------------|
| 0 | `-f/-d/-a` の `call-*` | 関数呼び出しパターンのみ | 多（型制約なし） |
| 1 | `type-*` | 引数の型まで含めて一致 | 中 |
| 2 | `obj-*` | 型 + object キーの部分集合 | 少（最も厳密） |

---

## 安定版の提供（2026-04 時点）

コミット `46cafe749faebdbc6a76988246a1d6282d79f052` 時点で安定で動作している

```bash
npm install
cd scripts
bash clone_dataset.sh   # datasets/test_result.json を取得
cd ..

cd src
npx ts-node setup.ts       # クライアントリポジトリのクローン・前処理
npx ts-node index_full_method.ts
```

> **注意:** `scripts/clone_dataset.sh` が存在しないので、現在のリポジトリの `scripts/clone_dataset.sh` をコピーして使用してください。
上記の内容は，現在の「make call-a」コマンドの出力に該当します。
