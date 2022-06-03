#!/bin/bash
set -e


function show_usage() {
	echo
	echo "acr_image_purge.sh"
	echo
	echo "Sets up auto-purging of images"
	echo
	echo -e "\t--registry-name\t(Required)The name of the ACR containing the images to protect/purge"
	echo
}


# Set default values here
registry_name=""


# Process switches:
while [[ $# -gt 0 ]]
do
	case "$1" in
		--registry-name)
			registry_name=$2
			shift 2
			;;
		*)
			echo "Unexpected '$1'"
			show_usage
			exit 1
			;;
	esac
done


if [[ -z $registry_name ]]; then
	echo "--registry-name must be specified"
	show_usage
	exit 1
fi



# Protect 'latest' tags to improve general build times
image_names=$(az acr repository list --name $registry_name -o tsv)


for image_name in ${image_names[@]}; 
do
	echo "Preventing delete for $image_name:latest"
	az acr repository update \
			--name $registry_name \
			--image $image_name:latest \
			--delete-enabled false \
			--write-enabled true
done


PURGE_CMD="acr purge --filter '.*:pr-[0-9a-fA-F]+' --ago 4d --untagged"

az acr task create --name prTagPruneTask \
  --cmd "$PURGE_CMD" \
  --registry $registry_name \
  --schedule "4 18 * * *" \
  --context /dev/null \
  --base-image-trigger-enabled false
