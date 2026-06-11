#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Building Woodpecker Plugin..."
echo ""

echo "==> Building common"
cd "$script_dir/../common"
npm install
npm run build

echo ""
echo "==> Building woodpecker-plugin"
cd "$script_dir/../woodpecker-plugin"
npm install
npm run build

echo ""
echo "==> Woodpecker plugin build completed successfully!"
