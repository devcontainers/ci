# devcontainer-build-run

devcontainer-build-run contains a GitHub action and Azure DevOps task aimed at making it easier to re-use a [Visual Studio Code dev container](https://code.visualstudio.com/) in a GitHub workflow or Azure DevOps pipeline.

This project builds on top of [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli)


## GitHub Action

The example below shows usage of the GitHub Action - see the [GitHub Action documentation](./docs/github-action.md) for more details:


```yaml
- name: Build and run dev container task
  uses: devcontainers/ci@v0.1
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


## CHANGELOG

### Version 0.2.0

This version updates the implementation to use [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli).

This brings many benefits around compatibility with VS Code Remote-Containers. One key area is that [container-features](https://code.visualstudio.com/docs/remote/containers#_dev-container-features-preview) can now be used in CI.

In theory, docker-compose based dev containers should also work however these are currently untested and image caching is blocked on [this issue](https://github.com/devcontainers/cli/issues/10)

### Version 0.1.x

0.1.x versions were the initial version of the action/task and attempted to mimic the behaviour of dev containers with manual `docker` commands