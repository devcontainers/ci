#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

figlet Build task
cd "$script_dir/../DevContainerBuildRun"
npm install
npm run all


figlet Package extension
cd "$script_dir/../"
# TODO - version bump!
tfx extension create --manifests vss-extension.json
