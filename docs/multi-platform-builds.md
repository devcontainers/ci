# Multiplatform Dev Container Builds

Building dev containers to support multiple platforms (aka CPU architectures) is possible with the devcontainers/ci GitHub Action/Azure DevOps Task, but requires other actions/tasks to be run beforehand and has several caveats.

## General Notes/Caveats

- Emulation-based multiplatform builds (using QEMU) will significantly increase build times over native, single architecture builds. For faster builds, consider using the [native matrix strategy](#native-multi-platform-builds-matrix-strategy) instead.
- If you are using runCmd, the command will only be run on the architecture of the system the build is running on. This means that, if you are using runCmd to test the image, there may be bugs on the alternate platforms that will not be caught by your test suite. Manual post-build testing is advised.
- GitHub Actions now offers hosted ARM runners (e.g. `ubuntu-24.04-arm`). For Azure Pipelines, you will need a self-hosted ARM agent for native ARM builds.

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
        uses: docker/setup-qemu-action@v3
      - name: Setup Docker buildx for multi-architecture builds
        uses: docker/setup-buildx-action@v3
        with:
          use: true
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and release devcontainer Multi-Platform
        uses: devcontainers/ci@v0.3
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

## Native Multi-Platform Builds (Matrix Strategy)

Instead of using QEMU emulation on a single runner, you can use native runners in a matrix strategy. Each runner builds for its own architecture and pushes a platform-specific image. A separate merge action/task then combines the per-platform images into a single multi-arch manifest.

### How it works

1. **Build jobs** run in parallel on native runners. Each job sets `useNativeRunner: true` and a single `platform` value (e.g., `linux/amd64`). The tag suffix is auto-derived from the platform (e.g., `linux/amd64` becomes `linux-amd64`). Build jobs must set `push: always` so that platform-specific images are pushed regardless of event filters (the merge job needs them in the registry).
2. **Merge job** runs after all build jobs complete. It uses a dedicated merge action (`devcontainers/ci/merge` for GitHub Actions, `DevcontainersMerge` for Azure DevOps) to combine the per-platform images into a multi-arch manifest. The platform-specific tags (e.g., `myimage:latest-linux-amd64`) remain in the registry after the merge.

### Benefits

- **Faster builds** -- no emulation overhead since each runner compiles natively.
- **More reliable** -- native compilation avoids QEMU compatibility issues.
- **Flexible runners** -- works with GitHub's hosted ARM runners (`ubuntu-24.04-arm`) or self-hosted ARM agents.

### GitHub Actions Example

In the workflow below, the `build` job is fanned out by the matrix into one run per entry: one runner builds and pushes `linux/amd64`, the other builds and pushes `linux/arm64`. Once both platform-specific images are in the registry, the `manifest` job merges them into one multi-arch tag.

```yaml
jobs:
  build:
    strategy:
      matrix:
        include:
          - runner: ubuntu-latest
            platform: linux/amd64
          - runner: ubuntu-24.04-arm
            platform: linux/arm64
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: devcontainers/ci@v0.3
        with:
          imageName: ghcr.io/example/myimage
          platform: ${{ matrix.platform }}
          useNativeRunner: true
          push: always

  manifest:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: devcontainers/ci/merge@v0.3
        with:
          imageName: ghcr.io/example/myimage
          platforms: linux/amd64,linux/arm64
```

> **Note:** The manifest job does not need `actions/checkout` since no source code is accessed.

### Azure DevOps Pipelines Example

```yaml
stages:
- stage: Build
  jobs:
  - job: BuildAmd64
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: Docker@2
      displayName: Login to Container Registry
      inputs:
        command: login
        containerRegistry: RegistryNameHere
    - script: docker buildx create --use
      displayName: Set up docker buildx
    - task: DevcontainersCi@0
      inputs:
        imageName: myregistry.azurecr.io/devcontainer
        platform: linux/amd64
        useNativeRunner: true
        push: always

  - job: BuildArm64
    pool:
      name: 'Self-Hosted-ARM64'
    steps:
    - task: Docker@2
      displayName: Login to Container Registry
      inputs:
        command: login
        containerRegistry: RegistryNameHere
    - script: docker buildx create --use
      displayName: Set up docker buildx
    - task: DevcontainersCi@0
      inputs:
        imageName: myregistry.azurecr.io/devcontainer
        platform: linux/arm64
        useNativeRunner: true
        push: always

- stage: Manifest
  dependsOn: Build
  jobs:
  - job: MergeManifest
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: Docker@2
      displayName: Login to Container Registry
      inputs:
        command: login
        containerRegistry: RegistryNameHere
    - script: docker buildx create --use
      displayName: Set up docker buildx
    - task: DevcontainersMerge@0
      inputs:
        imageName: myregistry.azurecr.io/devcontainer
        platforms: linux/amd64,linux/arm64
```
