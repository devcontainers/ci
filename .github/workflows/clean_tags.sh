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

image_name="stuartleeks/devcontainer-build-run/tests/dockerfile-context"

tag_id=$( curl -s  -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json"   https://api.github.com/users/stuartleeks/packages/container/devcontainer-build-run%2ftests%2fdockerfile-context/versions | jq -r '.[] | select(.metadata.container.tags | index("pr-119")) | .id')
echo $tag_id