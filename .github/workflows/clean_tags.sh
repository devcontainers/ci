#!/bin/bash
set -e


function show_usage() {
	echo
	echo "clean_tags.sh"
	echo
	echo "Clean tags across images"
	echo
	echo -e "\t--tag\t(Required)The tag to clean"
	echo
}


# Set default values here
tag=""

# Process switches:
while [[ $# -gt 0 ]]
do
	case "$1" in
		--tag)
			tag=$2
			shift 2
			;;
		*)
			echo "Unexpected '$1'"
			show_usage
			exit 1
			;;
	esac
done


if [[ -z $tag ]]; then
	echo "--tag"
	show_usage
	exit 1
fi

image_names=(
	"devcontainer-build-run-devcontainer"
	"devcontainer-build-run/tests/run-args"
	"devcontainer-build-run/tests/build-args"
	"devcontainer-build-run/tests/dockerfile-context"
	"devcontainer-build-run/tests/feature-docker-from-docker"
	"devcontainer-build-run/tests/docker-from-docker-non-root"
	"devcontainer-build-run/tests/docker-from-docker-root"
	"devcontainer-build-run/tests/skip-user-update"
)

for image_name in ${image_names[@]}; 
do
	escaped_image_name=$(echo ${image_name} | sed "s/\//%2f/g")
	version_id=$( curl -s  -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/users/stuartleeks/packages/container/$escaped_image_name/versions" | jq -r ".[] | select(.metadata.container.tags | index(\"${tag}\")) | .id")
	if [[ -n $version_id ]]; then
		echo "Found version '$version_id' for '$image_name:$tag' - deleting..."
	curl -s -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/users/stuartleeks/packages/container/$escaped_image_name/versions/$version_id"
	else
		echo "Tag '$tag' not found for '$image_name:$tag' - skipping"
	fi
done
