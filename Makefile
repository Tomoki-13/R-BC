export PATH := ./node_modules/.bin:$(PATH)
export NODE_OPTIONS := --max-old-space-size=8192

# ファイルと同名のターゲットが存在しても常にコマンドを実行する
.PHONY: install clone init setup \
        call-f type-f obj-f \
        call-d type-d obj-d \
        call-a type-a obj-a

# ==============================================================
# 初回セットアップ（install → clone の順に実行）
# ==============================================================

# 依存パッケージのインストール
install:
	npm install

# datasets/test_result.json をクローンして取得
# scripts/clone_dataset.sh が内部で cd .. するため cd scripts してから実行する
clone:
	cd scripts && bash clone_dataset.sh

# install + clone をまとめて実行（初回はこれだけ）
init: install clone

# ==============================================================
# setup: alldataset_clients のクローン・前処理
# ==============================================================

setup:
	ts-node src/setup.ts

# ==============================================================
# file モード: datasets/targets.json から対象を読み込む
# ==============================================================

# mode0: 関数呼び出しパターンのみでマッチング（型情報なし）
call-f:
	ts-node src/index.ts 0 file

# mode1: 引数の型まで含めてマッチング
type-f:
	ts-node src/index.ts 1 file

# mode2: 型 + object キーの部分集合でマッチング（最も厳密）
obj-f:
	ts-node src/index.ts 2 file

# ==============================================================
# direct モード: src/index.ts 内の INLINE_TARGETS を使う
# ==============================================================

call-d:
	ts-node src/index.ts 0 direct

type-d:
	ts-node src/index.ts 1 direct

obj-d:
	ts-node src/index.ts 2 direct

# ==============================================================
# auto モード: datasets/test_result.json から全ペアを実行
# ==============================================================

call-a:
	ts-node src/index.ts 0 auto

type-a:
	ts-node src/index.ts 1 auto

obj-a:
	ts-node src/index.ts 2 auto
