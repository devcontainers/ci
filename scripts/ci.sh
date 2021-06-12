#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


figlet common
cd "$script_dir/../common"
sudo npm install
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

if [[ -z IS_CI ]]; then
    echo "IS_CI not set, skipping package/publish"
    exit 0
fi

cd "$script_dir/.."

vsix_file=$(ls azdo-task/*.vsix)
echo "Using VSIX_FILE=$vsix_file"

tfx extension publish  --token $AZDO_TOKEN --vsix $vsix_file --override "{\"public\": false}" --share-with devcontainer-build-run,stuartle

tfx extension install  --token $AZDO_TOKEN --vsix $vsix_file --service-url https://dev.azure.com/stuartle


"$script_dir/../azdo-task/scripts/run-azdo-build.sh" --organization $AZDO_ORG --project $AZDO_PROJECT --build $AZDO_BUILD
