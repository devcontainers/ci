# Dev Container Build and Run (devcontainers/ci)

The Dev Container Build and Run GitHub Action is aimed at making it easier to re-use [Dev Containers](https://containers.dev) in a GitHub workflow. The Action supports using a Dev Container to run commands for CI, testing, and more, along with pre-building Dev Container image. Dev Container image building supports [Dev Container Features](https://containers.dev/implementors/features/#devcontainer-json-properties) and automatically places Dev Container [metadata on an image](https://containers.dev/implementors/spec/#image-metadata) label for simplified use.

A similar [Azure DevOps Task](./docs/azure-devops-task.md) is also available!

Note that this project builds on top of [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli) which can be used in other automation systems.

## GitHub Action
The examples below show usage of the GitHub Action - see the [GitHub Action documentation](./docs/github-action.md) for more details.

> **NOTE:** This Action is not currently capable of taking advantage of pre-built Codespaces. However, pre-built images are supported.


**Pre-building an image:**

```yaml
- name: Pre-build dev container image
  uses: devcontainers/ci@v0.2
  with:
    imageName: ghcr.io/example/example-devcontainer
    cacheFrom: ghcr.io/example/example-devcontainer
    push: true
```

**Using a Dev Container for a CI build:**

```yaml
- name: Run make ci-build in dev container
  uses: devcontainers/ci@v0.2
  with:    
    # [Optional] If you have a separate workflow like the one above
    # to pre-build your container image, you can reference it here
    # to speed up your application build workflows as well!
    cacheFrom: ghcr.io/example/example-devcontainer

    push: never
    runCmd: make ci-build
```

**Both at once:**

```yaml
- name: Pre-build image and run make ci-build in dev container
  uses: devcontainers/ci@v0.2
  with:
    imageName: ghcr.io/example/example-devcontainer
    cacheFrom: ghcr.io/example/example-devcontainer
    push: true
    runCmd: make ci-build
```

## CHANGELOG

### Version 0.2.0

This version updates the implementation to use [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli).

This brings many benefits around compatibility with Dev Containers. One key area is that [Dev Container Features](https://containers.dev/features) can now be used in CI along with recent enhancements like [image label support](https://containers.dev/implementors/reference/#labels).

### Version 0.1.x

0.1.x versions were the initial version of the action/task and attempted to mimic the behaviour of Dev Containers with manual `docker` commands
