#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [[ -z "$AZDO_TOKEN" ]]; then
	echo "AZDO_TOKEN must be specified"
	exit 1
fi

cd "$script_dir/.."
vsix_file=$(ls output/devcontainers-dev.*.vsix)
echo "Using VSIX_FILE=$vsix_file"

# Publish as non-public and as devcontainers-dev
echo "Publishing private extension version..."
tfx extension publish  --token "$AZDO_TOKEN" --vsix "$vsix_file" --override "{\"public\": false, \"publisher\": \"devcontainers-dev\"}" --share-with monacotools

echo "Installing private extension"
tfx extension install  --token "$AZDO_TOKEN" --vsix "$vsix_file" --service-url "$AZDO_ORG"

sleep 30s # hacky workaround for AzDO picking up stale extension version

echo "About to start AzDo build"
commit=$(git rev-parse HEAD)
echo "  commit   : $commit"
echo "  image_tag: $IMAGE_TAG"
"$script_dir/../azdo-task/scripts/run-azdo-build.sh" --organization "$AZDO_ORG" --project "$AZDO_PROJECT" --build "$AZDO_BUILD" --image-tag "$IMAGE_TAG" --commit "$commit"
