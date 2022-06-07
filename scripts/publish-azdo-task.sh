#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [[ -z "$MARKETPLACE_TOKEN" ]]; then
	echo "MARKETPLACE_TOKEN must be specified"
	exit 1
fi

cd "$script_dir/.."
echo "Publishing extension..."
vsix_file=$(ls output/stuartleeks.*.vsix)
echo "Using VSIX_FILE=$vsix_file"
tfx extension publish  --token $MARKETPLACE_TOKEN --vsix $vsix_file  --override "{\"public\": true}"
