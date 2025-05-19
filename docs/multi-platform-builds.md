# Multiplatform Dev Container Builds

Building dev containers to support multiple platforms (aka CPU architectures) is possible with the devcontainers/ci GitHub Action/Azure DevOps Task, but requires other actions/tasks to be run beforehand and has several caveats.

## Multiplatform with Emulation 

### General Notes/Caveats

- Multiplatform builds utilize emulation to build on architectures not native to the system the build is running on. This will significantly increase build times over native, single architecture builds.
- If you are using runCmd, the command will only be run on the architecure of the system the build is running on. This means that, if you are using runCmd to test the image, there may be bugs on the alternate platforms that will not be caught by your test suite. Manual post-build testing is advised.
- As of October 2022, all hosted servers for GitHub Actions and Azure Pipelines are x86_64 only. If you want to automatically run runCmd-based tests on your devcontainer on another architecure, you'll need a self-hosted runner on that architecture. It is possible that there will be future support for hosted arm64 machines, see [here for a tracking issue for Linux](https://github.com/actions/runner-images/issues/5631).

### GitHub Actions Example

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

### Azure DevOps Task Example

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


## Multiplatform with native runners

### General notes

- Uses matrix strategy to distribute platform builds across native runners
- Avoids cross-platform emulation for better performance and reliability
- Leverages the `imageDigests` output to capture platform-specific image digests
- Combines all platform-specific images into a single manifest list

### Benefits of Native Runners

Building on native runners instead of using QEMU emulation provides several advantages:

1. **Performance**: Native builds are significantly faster than emulated builds
2. **Reliability**: Some platform-specific operations may not work correctly under emulation
3. **Parallelization**: Building multiple platforms simultaneously reduces overall build time

### How the Matrix Outputs Work

- In Github Actions when jobs run in a matrix, only the last matrix instance to complete can set the value for a given output.
- To work around this, we take the json output from the action, and write it to separate output variables per runner
- `imageDigests: {"linux/amd64": "sha256@abc123"}` gets turned into `IMAGE_DIGEST_linux_amd64=sha256@abc123`
- This approach requires hardcoding the list of output variables

### Github Actions Example

```
name: Build Multi-Platform Images

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Build images on parallel native runners
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform:
          - linux/amd64
          - linux/arm64
      fail-fast: false
    outputs:
      IMAGE_DIGEST_linux_amd64: ${{ steps.build.outputs.IMAGE_DIGEST_linux_amd64 }}
      IMAGE_DIGEST_linux_arm64: ${{ steps.build.outputs.IMAGE_DIGEST_linux_arm64 }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: devcontainers/ci@v0.3
        with:
          imageName: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          platform: ${{ matrix.platform }}
          push: always
                
      # Combine all digests from the matrix into a single output
      - name: Set matrix outputs
        if: always()
        run: |
          # Extract the digest for this platform from the JSON output
          DIGESTS_JSON='${{ steps.build.outputs.imageDigests }}'
          PLATFORM="${{ matrix.platform }}"
          DIGEST=$(echo $DIGESTS_JSON | jq -r --arg platform "$PLATFORM" '.[$platform]')
          echo "IMAGE_DIGEST_${PLATFORM//\//_}=${DIGEST}" >> $GITHUB_OUTPUT
          

  # Create a manifest list from all platform images
  manifest:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
                
      - name: Create and push manifest list
        run: |
          IMAGE=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          
          # Create manifest list from each platform's digest
          docker buildx imagetools create \
            -t ${IMAGE}:latest \
            ${IMAGE}@${{ needs.build.outputs.IMAGE_DIGEST_linux_amd64 }} \
            ${IMAGE}@${{ needs.build.outputs.IMAGE_DIGEST_linux_arm64 }}

      - name: Inspect manifest
        run: |
          docker buildx imagetools inspect ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest 
```
