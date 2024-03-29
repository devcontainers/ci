# Dev Container Build and Run (devcontainers/ci)

The Dev Container Build and Run GitHub Action is aimed at making it easier to re-use [Dev Containers](https://containers.dev) in a GitHub workflow. The Action supports using a Dev Container to run commands for CI, testing, and more, along with pre-building a Dev Container image. Dev Container image building supports [Dev Container Features](https://containers.dev/implementors/features/#devcontainer-json-properties) and automatically places Dev Container [metadata on an image](https://containers.dev/implementors/spec/#image-metadata) label for simplified use.

> **NOTE:** The Action is not currently capable of taking advantage of pre-built Codespaces. However, pre-built images are supported.

A similar [Azure DevOps Task](./docs/azure-devops-task.md) is also available!

Note that this project builds on top of [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli) which can be used in other automation systems.

## Quick start
Here are three examples of using the Action for common scenarios. See the [documentation](./docs/github-action.md) for more details and a list of available [inputs](./docs/github-action.md#inputs).

**Pre-building an image:**

```yaml
- name: Pre-build dev container image
  uses: devcontainers/ci@v0.3
  with:
    imageName: ghcr.io/example/example-devcontainer
    cacheFrom: ghcr.io/example/example-devcontainer
    push: always
```

**Using a Dev Container for a CI build:**

```yaml
- name: Run make ci-build in dev container
  uses: devcontainers/ci@v0.3
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
  uses: devcontainers/ci@v0.3
  with:
    imageName: ghcr.io/example/example-devcontainer
    cacheFrom: ghcr.io/example/example-devcontainer
    push: always
    runCmd: make ci-build
```

## CHANGELOG

### Version 0.3.0 (24th February 2023)

This version updates the release mechanism for the GitHub action so that only the compiled JavaScript is included in the release.
The primary motivation is to simplify the process for contributing to the action, but a side-benefit should be a reduced download size when using the action.

### Version 0.2.0

This version updates the implementation to use [@devcontainers/cli](https://www.npmjs.com/package/@devcontainers/cli).

This brings many benefits around compatibility with Dev Containers. One key area is that [Dev Container Features](https://containers.dev/features) can now be used in CI along with recent enhancements like [image label support](https://containers.dev/implementors/reference/#labels).

### Version 0.1.x

0.1.x versions were the initial version of the action/task and attempted to mimic the behaviour of Dev Containers with manual `docker` commands
