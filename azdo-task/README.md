# Dev Container Build and Run Task

The Dev Container Build and Run Azure DevOps task aimed at making it easier to re-use a [Dev Container](https://containers.dev) in an Azure DevOps pipeline. It supports both using a Dev Container to run commands for CI, testing, and more along with pre-building Dev Container image. Dev Container image building supports [Dev Container Features](https://containers.dev/implementors/features/#devcontainer-json-properties) and automatically places Dev Container [metadata on an image](https://containers.dev/implementors/spec/#image-metadata) label for simplified use.


## Getting Started

The simplest example of using the action is shown below:

```yaml
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:

- task: DevcontainersCi@0
  inputs:
    # Change this to be your CI task/script
    runCmd: 'make ci-build'
```

With the example above, each time the action runs it will rebuild the Docker image for the dev container. To save time in builds, you can push the dev container image to a container registry (e.g. [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-intro)) and re-used the cached image in future builds.

To enable pushing the dev container image to a container registry you need to ensure that your pipeline is signed in to that registry.

The [`DevcontainersCi` task](https://marketplace.visualstudio.com/items?itemName=devcontainers.ci) uses Docker BuildKit to perform the Docker builds as this has support for storing layer cache metadata with the image. A version of Docker that supports BuiltKit is installed on the default hosted agents - if using a custom agent ensure that you make BuildKit available.

The example below shows logging in to an Azure Container Registry instance, and then building and running the dev container with the devcontainer-build-run action:

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

- task: DevcontainersCi@0
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

## Inputs

| Name                      | Required | Description                                                                                                                                                                                                                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imageName                 | true     | Image name to use when building the dev container image (including registry)                                                                                                                                                                                     |
| imageTag                  | false    | Image tag to use when building/pushing the dev container image (defaults to `latest`)                                                                                                                                                                            |
| subFolder                 | false    | Use this to specify the repo-relative path to the folder containing the dev container (i.e. the folder that contains the `.devcontainer` folder). Defaults to repo root                                                                                          |
| runCmd                    | true     | The command to run after building the dev container image                                                                                                                                                                                                        |
| env                       | false    | Specify environment variables to pass to the dev container when run                                                                                                                                                                                              |
| push                      | false    | One of: `never`, `filter`, `always`. When set to `filter`, the image if pushed if the `sourceBranchFilterForPush`, `buildReasonsForPush`, and `pushOnFailedBuild` conditions are met. Defaults to `filter` if `imageName` is set, `never` otherwise.             |
| pushOnFailedBuild         | false    | If `false` (default), only push if the build is successful. Set to true to push on failed builds                                                                                                                                                                 |
| sourceBranchFilterForPush | false    | Allows you to limit which branch's builds are pushed to the registry (only specified branches are allowed to push). If empty, all branches are allowed                                                                                                           |
| buildReasonsForPush       | false    | Allows you to limit the Build.Reason values that are allowed to push to the registry. Defaults to Manual, IndividualCI, BatchedCI. See https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&viewFallbackFrom=vsts&tabs=yaml |
| skipContainerUserIdUpdate | false    | For non-root Dev Containers (i.e. where `remoteUser` is specified), the action attempts to make the container user UID and GID match those of the host user. Set this to true to skip this step (defaults to false)                                              |
| cacheFrom                 | false    | Specify additional images to use for build caching                                                                                                                                                                                                               |

## Outputs

| Name         | Description                                             |
| ------------ | ------------------------------------------------------- |
| runCmdOutput | The output of the command specified in the runCmd input |

## Specifying a sub-folder

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
- task: DevcontainersCi@0
  inputs:
    imageName: 'yourregistry.azurecr.io/example-dev-container'
    subFolder: folderB
    runCmd: 'make ci-build'
```

## Environment Variables

If you want to pass additional environment variables to the dev container when it is run, you can use the `env` input as shown below.


```yaml
- task: DevcontainersCi@0
  inputs:
    imageName: 'yourregistry.azurecr.io/example-dev-container'
    runCmd: echo "$HELLO - $WORLD"
    env: |
      HELLO=Hello
      WORLD
```

In this example, the `HELLO` environment variable is specified with the value `Hello` in the `env` input on the devcontainer-build-run step. The `WORLD` environment variable is specified without a value so will pick up the value that is assigned in the standard action's `env` configuration.

The result from running the container is to output "Hello - World".
