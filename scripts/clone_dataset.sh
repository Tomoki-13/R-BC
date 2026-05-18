#!/bin/bash

set -Ceu

cd  ..
if [ -d "datasets" ]; then
    echo "datasets are already cloned"
    exit 0
fi

mkdir -p datasets

git clone https://github.com/Wakayama-SocSEL/Matsuda.git ./datasets/Matsuda
cp -rp ./datasets/Matsuda/output/test_result.json ./datasets/
rm -rf ./datasets/Matsuda

echo "successfully cloned datasets"