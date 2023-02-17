#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

sudo chown -R $(whoami) ~ # TODO - remove this

figlet common
cd "$script_dir/../common"
npm install
npm run build
npm run test

figlet GH Action
cd "$script_dir/../github-action"
npm install
npm run all

figlet AzDO Task
cd "$script_dir/../azdo-task/DevcontainersCi"
cp "$script_dir/../docs/azure-devops-task.md" "$script_dir/../azdo-task/README.md"
cp "$script_dir/../LICENSE" "$script_dir/../azdo-task/LICENSE.md"
npm install 
npm run all
cd "$script_dir/../azdo-task"

if [[ -n "$SKIP_VSIX" ]]; then
    echo "SKIP_VSIX set - skipping VSIX creation"
else
    echo "Creating VSIX (BUILD_NUMBER=${BUILD_NUMBER})"
    ./scripts/build-package.sh --set-patch-version $BUILD_NUMBER

    echo "Copying VSIX files to output folder"
    mkdir -p "$script_dir/../output"
    cp *.vsix "$script_dir/../output/"
    ls -l "$script_dir/../output/"
fi

if [[ -z $IS_CI ]]; then
    echo "IS_CI not set, skipping git status check"
    exit 0
fi

figlet git status
cd "$script_dir/.."
# vss-extension.json and task.json have their version info modified by the build
# reset these before checking for changes
git checkout azdo-task/vss-extension.json
git checkout azdo-task/DevcontainersCi/task.json
# The GH action to generate the build number leaves a BUILD_NUMBER file behind
if [[ -f BUILD_NUMBER ]]; then
    rm BUILD_NUMBER
fi
if [[ -n $(git status --short) ]]; then
    echo "*** There are unexpected changes in the working directory (see git status output below)"
    echo "*** Ensure you have run scripts/build-local.sh"
    git status
    exit 1
fi
