# devcontainer-build-run

devcontainer-build-run is the start of a GitHub action and Azure DevOps task aimed at making it easier to re-use a [Visual Studio Code dev container](https://code.visualstudio.com/) in a GitHub workflow or Azure DevOps pipeline.

**Status: this is a pet project that I've been experimenting with. It is not supported and you should expect bugs :-)**

NOTE: Currently, the devcontainer-build-run action only supports Dockerfile-based dev containers

- [GitHub Action](#github-action)
- [Azure DevOps Task](#azure-devops-task)

## GitHub Action

###  Getting Started

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
  build:
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
        uses: stuartleeks/devcontainer-build-run@v0.1
        with:
          # Change this to point to your image name
          imageName: ghcr.io/example/example-devcontainer
          # Change this to be your CI task/script
          runCmd: make ci-build

```

In the example above, the devcontainer-build-run will perform the following steps:

1. Build the dev container using the `.devcontainer/devcontainer.json` from the root of the repo
2. Run the dev container with the `make ci-build` command specified in the `runCmd` input
3. If the run succeeds (and we're not building from a PR branch) then push the image to the container registry. This enables future image builds in step 1 to use the image layers as a cache to improve performance

### Inputs

| Name         | Required | Description                                                                                                                                                             |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imageName    | true     | Image name to use when building the dev container image (including registry)                                                                                            |
| subFolder    | false    | Use this to specify the repo-relative path to the folder containing the dev container (i.e. the folder that contains the `.devcontainer` folder). Defaults to repo root |
| runCmd       | true     | The command to run after building the dev container image                                                                                                               |
| env          | false    | Specify environment variables to pass to the dev container when run                                                                                                     |
| checkoutPath | false    | Only used for development/testing                                                                                                                                       |

### Specifying a sub-folder

Suppose your repo has the following structure:

```
<repo-root>
|-folderA
|-folderB
| |-.devcontainer
| | |-devcontainer.json
| | |-Dockerfile
| |-main.go
|-folderC
...
```

To build and run the dev container from `folderB` you can specify the `subFolder` input as shown below.

```yaml
      - name: Build and run dev container task
        uses: stuartleeks/devcontainer-build-run@v0.1
        with:
          subFolder: folderB
          imageName: ghcr.io/example/example-devcontainer
          runCmd: make ci-build
```

### Environment Variables

If you want to pass additional environment variables to the dev container when it is run, you can use the `env` input as shown below.


```yaml
      - name: Build and run dev container task
        uses: stuartleeks/devcontainer-build-run@v0.1
        env:
          WORLD: World
        with:
          subFolder: folderB
          imageName: ghcr.io/example/example-devcontainer
          runCmd: echo "$HELLO - $WORLD"
          env: |
            HELLO=Hello
            WORLD
```

In this example, the `HELLO` environment variable is specified with the value `Hello` in the `env` input on the devcontainer-build-run step. The `WORLD` environment variable is specified without a value so will pick up the value that is assigned in the standard action's `env` configuration (it could also be picked up from the job environment variables - see the [GitHub Action Environment Variables docs](https://docs.github.com/en/actions/reference/environment-variables) for more information).

The result from running the container is to output "Hello - World".

### Azure DevOps Task

The [`devcontainer-build-run` task](https://marketplace.visualstudio.com/items?itemName=stuartleeks.devcontainer-build-run) uses Docker BuildKit to perform the Docker builds as this has support for storing layer cache metadata with the image. A version of Docker that supports BuiltKit is installed on the default hosted agents - if using a custom agent ensure that you make BuildKit available.

To enable pushing the dev container image to a container registry you need to ensure that your pipeline is signed in to that registry.

The example below shows logging in to GitHub Container Registry, and then building and running the dev container with the devcontainer-build-run action:

```yaml
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:
# Replace the username and registry name here with your own details
# This step also uses an ACR_TOKEN specified as a secret variable
- script: |
    docker login -u test -p $ACR_TOKEN yourregistry.azurecr.io
  displayName: 'Log in to Container Registry'
  env:
    ACR_TOKEN: $(ACR_TOKEN)

- task: DevContainerBuildRun@0
  inputs:
    # Change this to point to your image name
    imageName: 'yourregistry.azurecr.io/example-dev-container'
    # Change this to be your CI task/script
    runCmd: 'make ci-build'
    # sourceBranchFilterForPush allows you to limit which branch's builds
    # are pushed to the registry
    sourceBranchFilterForPush: refs/heads/main
```

In the example above, the devcontainer-build-run will perform the following steps:

1. Build the dev container using the `.devcontainer/devcontainer.json` from the root of the repo
2. Run the dev container with the `make ci-build` command specified in the `runCmd` input
3. If the run succeeds (and we're not building from a PR branch) then push the image to the container registry. This enables future image builds in step 1 to use the image layers as a cache to improve performance

### Inputs

| Name                      | Required | Description                                                                                                                                                                                                                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imageName                 | true     | Image name to use when building the dev container image (including registry)                                                                                                                                                                                     |
| subFolder                 | false    | Use this to specify the repo-relative path to the folder containing the dev container (i.e. the folder that contains the `.devcontainer` folder). Defaults to repo root                                                                                          |
| runCmd                    | true     | The command to run after building the dev container image                                                                                                                                                                                                        |
| env                       | false    | Specify environment variables to pass to the dev container when run                                                                                                                                                                                              |
| sourceBranchFilterForPush | false    | Allows you to limit which branch's builds are pushed to the registry (only specified branches are allowed to push). If empty, all branches are allowed                                                                                                           |
| buildReasonsForPush       | false    | Allows you to limit the Build.Reason values that are allowed to push to the registry. Defaults to Manual, IndividualCI, BatchedCI. See https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&viewFallbackFrom=vsts&tabs=yaml |

The [environment variables](#environment-variables) and [specifying a sub folder](#specifying-a-sub-folder) sections for the GitHub action are also relevant for the Azure DevOps task
