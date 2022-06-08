#!/bin/bash
set -e


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
	echo "Checking for untagged versions for $image_name"
	escaped_image_name=$(echo ${image_name} | sed "s/\//%2f/g")
	version_ids=$(curl -s  -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions?per_page=100" | jq -r ".[] | select(.metadata.container.tags | length ==0) | .id")
	for version_id in ${version_ids[@]}; 
	do
		echo -e "\tDeleting version '$version_id' for '$image_name:$tag' ..."
		curl -s -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions/$version_id"
	done
done
