#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

sudo chown -R $(whoami) ~ # TODO - remove this

figlet common
cd "$script_dir/../common"
npm install
npm run test

figlet GH Action
cd "$script_dir/../github-action"
sudo npm install
make build-package

figlet AzDO Task
cd "$script_dir/../azdo-task/DevContainerBuildRun"
sudo npm install 
cd "$script_dir/../azdo-task"
./scripts/build-package.sh --set-patch-version $BUILD_NUMBER

mkdir -p "$script_dir/../output"
cp *.vsix "$script_dir/../output/"

figlet git status
git status
