#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [[ -z "$AZDO_TOKEN" ]]; then
	echo "AZDO_TOKEN must be specified"
	exit 1
fi

cd "$script_dir/.."
echo "Publishing extension..."
vsix_file=$(ls output/devcontainers.*.vsix)
echo "Using VSIX_FILE=$vsix_file"
tfx extension publish  --token $AZDO_TOKEN --vsix $vsix_file  --override "{\"public\": true}"
