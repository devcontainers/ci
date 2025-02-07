#!/bin/bash
set -e


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

for image_name in ${image_names[@]}; 
do
	echo "Checking for untagged versions for $image_name"
	escaped_image_name=$(echo ${image_name} | sed "s/\//%2f/g")
	response=$(curl -s  -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions?per_page=100")
	message=$(echo "$response" | jq -r ".message?")
	if [[ -z "$message" || "$message" == "null" ]]; then
		version_ids=$(echo "$response" | jq -r ".[] | select(.metadata.container.tags | length ==0) | .id")
		for version_id in ${version_ids[@]};
		do
			echo -e "\tDeleting version '$version_id' for '$image_name:$tag' ..."
			curl -s -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN"  -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/devcontainers/packages/container/$escaped_image_name/versions/$version_id"
		done
	else
		echo "Error: $message"
	fi
done

echo "Done."
