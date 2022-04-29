#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Get run id for latest successful CI build on main
echo "Finding latest CI run ..."
run_id=$(gh run list --repo devcontainers/cli --workflow "Dev Containers CI" --branch main --json databaseId,conclusion | jq -r 'map(select(.conclusion=="success")) | first | .databaseId')

# create tmp dir for downloading artifacts
tmp_dir="$script_dir/tmp"
rm -rf "$tmp_dir"
mkdir -p "$tmp_dir"
echo '*' > "$tmp_dir/.gitignore"

echo "Got run id $run_id, downloading artifacts ..."
gh run download --repo devcontainers/cli $run_id --dir "$tmp_dir"

cli_tar_folder=$(ls $tmp_dir | grep dev-containers-cli-.*.tgz)
if [[ -z "$cli_tar_folder" ]]; then
  echo "Could not find cli tar folder in downloaded artifacts"
  exit 1
fi

cli_tar_file=$(ls $tmp_dir/$cli_tar_folder | grep dev-containers-cli-.*.tgz)
if [[ -z "$cli_tar_file" ]]; then
  echo "Could not find cli tar file in $cli_tar_folder"
  exit 1
fi
echo "Got cli tar file $cli_tar_file ..."


echo "Extracting cli ..."
mkdir -p "$tmp_dir/cli"
tar xf "$tmp_dir/$cli_tar_folder/$cli_tar_file" --directory="$tmp_dir/cli"

# Clean cli folder
cli_dir="$script_dir/../cli"
rm -rf "$cli_dir"
mkdir -p "$cli_dir"

mv "$tmp_dir/cli/package" "$cli_dir"
