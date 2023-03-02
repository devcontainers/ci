#!/bin/bash
set -e


script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


function show_usage() {
    echo
    echo "build-package.sh"
    echo
    echo "Build the AzDO task package"
    echo
    echo -e "\t--set-patch-version\t(Optional)If set then the patch version will be updated before packaging"
    echo
}
# Set default values here
set_patch_version=""

# Process switches:
while [[ $# -gt 0 ]]
do
    case "$1" in
        --set-patch-version)
            set_patch_version=$2
            if [[ -z $2 ]]; then
                shift 1
            else
                shift 2
            fi
            ;;
        *)
            echo "Unexpected '$1'"
            show_usage
            exit 1
            ;;
    esac
done

figlet Version

if [[ -n $set_patch_version ]]; then
    echo "--set-patch-version specified. Setting task patch version to $set_patch_version"
    sed -i "s/\"Patch\": 0/\"Patch\": $set_patch_version/g" DevcontainersCi/task.json
else
    echo "--set-patch-version not set"
fi

VERSION_MAJOR=$(cat DevcontainersCi/task.json   |jq .version.Major)
VERSION_MINOR=$(cat DevcontainersCi/task.json   |jq .version.Minor)
VERSION_PATCH=$(cat DevcontainersCi/task.json   |jq .version.Patch)

echo "VERSION_MAJOR=${VERSION_MAJOR}"
echo "VERSION_MINOR=${VERSION_MINOR}"
echo "VERSION_PATCH=${VERSION_PATCH}"

echo "version=$VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH" >> $GITHUB_OUTPUT
echo "version_short=$VERSION_MAJOR.$VERSION_MINOR" >> $GITHUB_OUTPUT
echo "version_major=$VERSION_MAJOR" >> $GITHUB_OUTPUT

if [[ -n $set_patch_version ]]; then
    echo "--set-patch-version specified. Setting extension version to $VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH"
    sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"$VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH\"/g" vss-extension.json
fi


figlet Build task
cd "$script_dir/../DevcontainersCi"
npm install
npm run all

echo prune
npm prune --production

figlet Package extension
cd "$script_dir/../"
echo "Build devcontainers extension vsix..."
tfx extension create --manifests vss-extension.json --override "{\"public\": true, \"version\": \"$VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH\"}"
echo "Build devcontainers-dev extension vsix..."
tfx extension create --manifests vss-extension.json --override "{\"public\": false, \"version\": \"$VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH\", \"publisher\": \"devcontainers-dev\"}"
