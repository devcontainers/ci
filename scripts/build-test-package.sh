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
npm install
npm run all

figlet AzDO Task
cd "$script_dir/../azdo-task/DevContainerBuildRun"
npm install 
npm run all
cd "$script_dir/../azdo-task"
if [[ -n "$SKIP_VSIX" ]]; then
    echo "SKIP_VSIX set - skipping VSIX creation"
else
    ./scripts/build-package.sh --set-patch-version $BUILD_NUMBER

    mkdir -p "$script_dir/../output"
    cp *.vsix "$script_dir/../output/"
fi

cd "$script_dir/.."
figlet git status
git status
