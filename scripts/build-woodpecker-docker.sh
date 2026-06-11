#!/bin/bash
set -e

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
repo_root="$script_dir/.."

# Default values
IMAGE_NAME="${IMAGE_NAME:-devcontainer-woodpecker}"
IMAGE_TAG="${IMAGE_TAG:-local}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
PUSH="${PUSH:-false}"

echo "Building Woodpecker Plugin Docker Image"
echo "========================================"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Platforms: ${PLATFORMS}"
echo "Push: ${PUSH}"
echo ""

cd "$repo_root"

if [ "$PUSH" = "true" ]; then
    echo "Building and pushing multi-platform image..."
    docker buildx build \
        --platform "$PLATFORMS" \
        -f woodpecker-plugin/Dockerfile \
        -t "${IMAGE_NAME}:${IMAGE_TAG}" \
        --push \
        .
else
    echo "Building image for local use..."
    docker build \
        -f woodpecker-plugin/Dockerfile \
        -t "${IMAGE_NAME}:${IMAGE_TAG}" \
        .
fi

echo ""
echo "==> Docker image built successfully!"
echo "    Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To test the image locally, run:"
echo "  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\"
echo "    -v \$(pwd):/workspace \\"
echo "    -e PLUGIN_RUN_CMD='echo Hello from Dev Container' \\"
echo "    -e CI_WORKSPACE=/workspace \\"
echo "    ${IMAGE_NAME}:${IMAGE_TAG}"
