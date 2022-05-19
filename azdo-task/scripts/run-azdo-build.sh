#!/bin/bash
set -e

function show_usage() {
    echo
    echo "run-azdo-build.sh"
    echo
    echo "Run an AzDO build. Assumes that auth has been configured, e.g. via the AZURE_DEVOPS_EXT_PAT env var (https://docs.microsoft.com/en-gb/azure/devops/cli/log-in-via-pat?view=azure-devops&tabs=windows)"
    echo
    echo -e "\t--organization\t(Required)The AzDO organization url"
    echo -e "\t--project\t(Required)The AzDO project name"
    echo -e "\t--build\t(Required)The build name"
    echo -e "\t--image-tag\t(Required)The image tag for dev containers build in the pipeline"
    echo -e "\t--branch\t(Required)The branch ref to build"
    echo
}


# Set default values here
organization=""
project=""
build=""
image_tag=""
branch_ref=""

# Process switches:
while [[ $# -gt 0 ]]
do
    case "$1" in
        --organization)
            organization=$2
            shift 2
            ;;
        --project)
            project=$2
            shift 2
            ;;
        --build)
            build=$2
            shift 2
            ;;
        --image-tag)
            image_tag=$2
            shift 2
            ;;
        --branch)
            branch_ref=$2
            shift 2
            ;;
        *)
            echo "Unexpected '$1'"
            show_usage
            exit 1
            ;;
    esac
done


if [[ -z $organization ]]; then
    echo "--organization must be specified"
    show_usage
    exit 1
fi
if [[ -z $project ]]; then
    echo "--project must be specified"
    show_usage
    exit 1
fi
if [[ -z $build ]]; then
    echo "--build must be specified"
    show_usage
    exit 1
fi
if [[ -z $image_tag ]]; then
    echo "--image-tag must be specified"
    show_usage
    exit 1
fi
if [[ -z $branch_ref ]]; then
    echo "--branch must be specified"
    show_usage
    exit 1
fi


echo "Starting AzDO pipeline..."
run_json=$(az pipelines build queue --definition-name "$build" --organization "$organization" --project "$project" --branch "$branch_ref" --variables IMAGE_TAG=$image_tag -o json)
run_id=$(echo $run_json | jq -r .id)
run_url="$organization/$project/_build/results?buildId=$run_id"
echo "Run id: $run_id"
echo "Run url: $run_url"
while true
do
    run_state=$(az pipelines runs show --id "$run_id" --organization "$organization" --project "$project" -o json)
    finish_time=$(echo $run_state | jq -r .finishTime)
    if [[ $finish_time != "null" ]]; then
        result=$(echo $run_state | jq -r .result)
        echo "Pipeline completed with result: $result"
        if [[ $result != "succeeded" ]]; then
            echo "Run url: $run_url"
            echo "::error ::AzDO pipeline test did not complete successfully"
            exit 1
        fi
        exit 0
    fi
    echo "waiting for pipeline completion..."
    sleep 15s
done


