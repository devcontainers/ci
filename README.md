# devcontainer-build-run

devcontainer-build-run is the start of a GitHub action aimed at making it easier to re-use a [Visual Studio Code dev container](https://code.visualstudio.com/) in a GitHub workflow.

**Status: this is a pet project that I've been experimenting with. It is not supported and you should expect bugs :-)**

NOTE: Currently, the devcontainer-build-run action only supports Dockerfile-based dev containers

## Getting Started

The `devcontainer-build-run` action uses Docker BuildKit to perform the Docker builds as this has support for storing layer cache metadata with the image. You can use the [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action) to install this (see example below).

To enable pushing the dev container image to a container registry you need to ensure that your GitHub workflow is signed in to that registry.

The example below shows installing Docker BuildKit, logging in to GitHub Container Registry, and then building and running the dev container with the devcontainer-build-run action:


```yaml
name: 'build' 
on: # rebuild any PRs and main branch changes
  pull_request:
  push:
    branches:
      - main

jobs:
  build: # make sure build/ci work properly
    runs-on: ubuntu-latest
    steps:

      - name: Checkout (GitHub)
        uses: actions/checkout@v2

      - name: Set up Docker BuildKit
        uses: docker/setup-buildx-action@v1

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v1 
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}        

      - name: Build and run dev container task
        uses: stuartleeks/devcontainer-build-run@v0.1-alpha
        with:
          # Change this to point to your image name
          imageName: ghcr.io/stuartleeks/devcontainer-build-run-examples-build-args
          # Change this to be your CI task/script
          runCmd: make ci-build

```

In the example above, the devcontainer-build-run will perform the following steps:

1. Build the dev container using the `.devcontainer/devcontainer.json` from the root of the repo
2. Run the dev container with the `make ci-build` command specified in the `runCmd` input
3. If the run succeeds (and we're not building from a PR branch) then push the image to the container registry. This enables future image builds in step 1 to use the image layers as a cache to improve performance

