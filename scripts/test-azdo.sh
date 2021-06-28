#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

sudo chown -R $(whoami) ~ # TODO - remove this

cd "$script_dir/.."
vsix_file=$(ls output/stuartleeks-dev.*.vsix)
echo "Using VSIX_FILE=$vsix_file"

# Publish as non-public and as stuartleeks-dev
tfx extension publish  --token $AZDO_TOKEN --vsix $vsix_file --override "{\"public\": false, \"publisher\": \"stuartleeks-dev\"}" --share-with devcontainer-build-run,stuartle

tfx extension install  --token $AZDO_TOKEN --vsix $vsix_file --service-url $AZDO_ORG

sleep 30s # hacky workaround for AzDO picking up stale extension version

"$script_dir/../output/scripts/run-azdo-build.sh" --organization $AZDO_ORG --project $AZDO_PROJECT --build $AZDO_BUILD
