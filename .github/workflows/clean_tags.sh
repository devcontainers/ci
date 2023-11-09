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
	"ci-devcontainer"
	"ci/tests/run-args"
	"ci/tests/build-args"
	"ci/tests/dockerfile-context"
	"ci/tests/feature-docker-from-docker"
	"ci/tests/docker-from-docker-non-root"
	"ci/tests/docker-from-docker-root"
	"ci/tests/skip-user-update"
)

echo "Checking for tag $tag:"

for image_name in ${image_names[@]}; 
do
	echo "Checking image $image_name..."
	escaped_image_name=$(echo ${image_name} | sed "s/\//%2f/g")
	response=$(curl -s  -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions")
	message=$(echo "$response" | jq -r ".message?")
	if [[ -z "$message" || "$message" == "null" ]]; then
		version_id=$(echo "$response" | jq -r ".[] | select(.metadata.container.tags | index(\"${tag}\")) | .id")
		if [[ -n $version_id ]]; then
			echo "Found version '$version_id' for '$image_name:$tag' - deleting..."
		curl -s -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions/$version_id"
		else
			echo "Tag '$tag' not found for '$image_name:$tag' - skipping"
		fi
	else
		echo "Error: $message"
	fi
done


echo "Done."