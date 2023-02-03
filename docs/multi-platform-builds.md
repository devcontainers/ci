# Multiplatform Dev Container Builds

Building dev containers to support multiple platforms (aka CPU architectures) is possible with the devcontainers/ci GitHub Action/Azure DevOps Task, but requires other actions/tasks to be run beforehand and has several caveats.

## General Notes/Caveats

- Multiplatform builds utilize emulation to build on architectures not native to the system the build is running on. This will significantly increase build times over native, single architecture builds.
- If you are using runCmd, the command will only be run on the architecure of the system the build is running on. This means that, if you are using runCmd to test the image, there may be bugs on the alternate platforms that will not be caught by your test suite. Manual post-build testing is advised.
- As of October 2022, all hosted servers for GitHub Actions and Azure Pipelines are x86_64 only. If you want to automatically run runCmd-based tests on your devcontainer on another architecure, you'll need a self-hosted runner on that architecture. It is possible that there will be future support for hosted arm64 machines, see [here for a tracking issue for Linux](https://github.com/actions/runner-images/issues/5631).

## GitHub Actions Example

```
name: 'build'
on:
  pull_request:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (GitHub)
        uses: actions/checkout@v3
      - name: Set up QEMU for multi-architecture builds
        uses: docker/setup-qemu-action@v1
      - name: Setup Docker buildx for multi-architecture builds
        uses: docker/setup-buildx-action@v1
        with:
          use: true
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v1
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and release devcontainer Multi-Platform
        uses: devcontainers/ci@v0.2
        with:
          imageName: ghcr.io/UserNameHere/ImageNameHere
          platform: linux/amd64,linux/arm64
```

## Azure DevOps Task Example

```
trigger:
- main

pool:
  vmImage: ubuntu-latest

jobs:
- job: BuildContainerImage
  displayName: Build Container Image
  timeoutInMinutes: 0
  steps:
  - checkout: self
  - task: Docker@2
    displayName: Login to Container Registry
    inputs:
      command: login
      containerRegistry: RegistryNameHere
  - script: docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
    displayName: Set up QEMU
  - script: docker buildx create --use
    displayName: Set up docker buildx
  - task: DevcontainersCi@0
    inputs:
      imageName: UserNameHere/ImageNameHere
      platform: linux/amd64,linux/arm64
```
