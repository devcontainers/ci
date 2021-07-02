# devcontainer-build-run

devcontainer-build-run is the start of a GitHub action and Azure DevOps task aimed at making it easier to re-use a [Visual Studio Code dev container](https://code.visualstudio.com/) in a GitHub workflow or Azure DevOps pipeline.

**Status: this is a pet project that I've been experimenting with. It is not supported and you should expect bugs :-)**

NOTE: Currently, the devcontainer-build-run action only supports Dockerfile-based dev containers

## GitHub Action

The example below shows usage of the GitHub Action - see the [GitHub Action documentation](./docs/github-action.md) for more details:


```yaml
- name: Build and run dev container task
  uses: stuartleeks/devcontainer-build-run@v0.1
  with:
    imageName: ghcr.io/example/example-devcontainer
    runCmd: make ci-build
```

## Azure DevOps Task

The example below shows usage of the Azure DevOps Task - see the [Azure DevOps Task documentation](./docs/azure-devops-task.md) for more details:

```yaml
- task: DevContainerBuildRun@0
  inputs:
    imageName: 'yourregistry.azurecr.io/example-dev-container'
    runCmd: 'make ci-build'
    sourceBranchFilterForPush: refs/heads/main
```
