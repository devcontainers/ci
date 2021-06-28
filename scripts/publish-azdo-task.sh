#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$script_dir/.."
echo "Publishing extension..."
vsix_file=$(ls output/stuartleeks.*.vsix)
echo "Using VSIX_FILE=$vsix_file"
tfx extension publish  --token $AZDO_TOKEN --vsix $vsix_file  --override "{\"public\": true}"
