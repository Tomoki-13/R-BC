export PATH := ./node_modules/.bin:$(PATH)
export NODE_OPTIONS := --max-old-space-size=8192

# 実行 ID: 親 Make から渡されたものを利用、未設定ならここで生成
# 出力は ../outputs/history/R-BC/<mode>/<BCPG_RUN_ID>/ に書かれ、その後 ../outputs/latest/R-BC/ にコピーされる
BCPG_RUN_ID ?= $(shell date +%Y-%m-%d-%H-%M-%S)
export BCPG_RUN_ID

LATEST_DIR  := ../outputs/latest/R-BC
HISTORY_DIR := ../outputs/history/R-BC

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
# scripts/clone_dataset.sh が内部で cd ../.. するため cd scripts してから実行する
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
# 内部サブルーチン: history → latest コピー
# 引数 $(1) は mode ディレクトリ名 (method / type-method / type-method-object)
# ==============================================================
define copy_to_latest
	@mkdir -p $(LATEST_DIR)
	rm -rf $(LATEST_DIR)/$(1)
	cp -r $(HISTORY_DIR)/$(1)/$(BCPG_RUN_ID) $(LATEST_DIR)/$(1)
	@echo "[R-BC] copied: history/R-BC/$(1)/$(BCPG_RUN_ID) → latest/R-BC/$(1)"
endef

# ==============================================================
# file モード: datasets/targets.json から対象を読み込む
# ==============================================================

# mode0: 関数呼び出しパターンのみでマッチング（型情報なし）
call-f:
	ts-node src/index.ts 0 file
	$(call copy_to_latest,method)

# mode1: 引数の型まで含めてマッチング
type-f:
	ts-node src/index.ts 1 file
	$(call copy_to_latest,type-method)

# mode2: 型 + object キーの部分集合でマッチング（最も厳密）
obj-f:
	ts-node src/index.ts 2 file
	$(call copy_to_latest,type-method-object)

# ==============================================================
# direct モード: src/index.ts 内の INLINE_TARGETS を使う
# ==============================================================

call-d:
	ts-node src/index.ts 0 direct
	$(call copy_to_latest,method)

type-d:
	ts-node src/index.ts 1 direct
	$(call copy_to_latest,type-method)

obj-d:
	ts-node src/index.ts 2 direct
	$(call copy_to_latest,type-method-object)

# ==============================================================
# auto モード: datasets/test_result.json から全ペアを実行
# ==============================================================

call-a:
	ts-node src/index.ts 0 auto
	$(call copy_to_latest,method)

type-a:
	ts-node src/index.ts 1 auto
	$(call copy_to_latest,type-method)

obj-a:
	ts-node src/index.ts 2 auto
	$(call copy_to_latest,type-method-object)
