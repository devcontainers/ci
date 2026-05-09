# Dev Container Build and Run GitHub Action

The Dev Container Build and Run GitHub Action is aimed at making it easier to re-use [Dev Containers](https://containers.dev) in a GitHub workflow. The Action supports using a Dev Container to run commands for CI, testing, and more along with pre-building Dev Container image. Dev Container image building supports [Dev Container Features](https://containers.dev/implementors/features/#devcontainer-json-properties) and automatically places Dev Container [metadata on an image](https://containers.dev/implementors/spec/#image-metadata) label for simplified use.

> **NOTE:** This Action cannot currently take advantage of [pre-built Codespaces](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds). However, you can create or use pre-built container images.

##  Getting Started


The simplest example of using the action is shown below:

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
        uses: actions/checkout@v3

      - name: Build and run dev container task
        uses: devcontainers/ci@v0.3
        with:
          # Change this to be your CI task/script
          runCmd: yarn test
```

With the example above, each time the action runs it will rebuild the Docker image for the dev container. To save time in builds, you can push the dev container image to a container registry (e.g. [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)) and re-used the cached image in future builds.

To enable pushing the dev container image to a container registry you need to specify a qualified `imageName` and ensure that your GitHub workflow is signed in to that registry.

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
        uses: actions/checkout@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2 
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and run Dev Container task
        uses: devcontainers/ci@v0.3
        with:
          # Change this to point to your image name
          imageName: ghcr.io/example/example-devcontainer
          # Change this to be your CI task/script
          runCmd: |
            # Add multiple commands to run if needed
            make install-packages
            make ci-build
```

In the example above, the devcontainer-build-run will perform the following steps:

1. Build the dev container using the `.devcontainer/devcontainer.json` from the root of the repo
2. Run the dev container with the `make ci-build` command specified in the `runCmd` input
3. If the run succeeds (and we're not building from a PR branch) then push the image to the container registry. This enables future image builds in step 1 to use the image layers as a cache to improve performance

The [`devcontainers/ci` action](https://github.com/marketplace/actions/devcontainers-ci) uses Docker BuildKit to perform the Docker builds as this has support for storing layer cache metadata with the image. This is installed by default on hosted runners, but you can use the [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action) to install this on your own runners.


### Other examples

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


## Inputs

| Name                      | Required | Description                                                                                                                                                                                                                                    |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imageName                 | true     | Image name to use when building the dev container image (including registry)                                                                                                                                                                   |
| imageTag                  | false    | One or more comma-separated image tags (defaults to `latest`)                                                                                                                                                                                  |
| subFolder                 | false    | Use this to specify the repo-relative path to the folder containing the dev container (i.e. the folder that contains the `.devcontainer` folder). Defaults to repo root                                                                        |
| configFile                | false    | Use this to specify the repo-relative path to the devcontainer.json file. Defaults to `./.devcontainer/devcontainer.json` and `./.devcontainer.json`. |
| runCmd                    | true     | The command to run after building the dev container image                                                                                                                                                                                      |
| env                       | false    | Specify environment variables to pass to the dev container when run                                                                                                                                                                            |
| inheritEnv                | false    | Inherit all environment variables of the runner CI machine                                                                                                                                                                                     |
| checkoutPath              | false    | Only used for development/testing                                                                                                                                                                                                              |
| push                      | false    | Control when images are pushed. Options are `never`, `filter`, `always`. For `filter`, images are pushed if the `refFilterForPush` and `eventFilterForPush` conditions are met. Defaults to `filter` if `imageName` is set, `never` otherwise. |
| refFilterForPush          | false    | Set the source branches (e.g. `refs/heads/main`) that are allowed to trigger a push of the dev container image. Leave empty to allow all (default)                                                                                             |
| eventFilterForPush        | false    | Set the event names (e.g. `pull_request`, `push`) that are allowed to trigger a push of the dev container image. Defaults to `push`. Leave empty for all                                                                                       |
| skipContainerUserIdUpdate | false    | For non-root Dev Containers (i.e. where `remoteUser` is specified), the action attempts to make the container user UID and GID match those of the host user. Set this to true to skip this step (defaults to false)                            |
| cacheFrom                 | false    | Specify additional images to use for build caching                                                                                                                                                                                             |
| noCache                   | false    | Builds the image with `--no-cache` (takes precedence over `cacheFrom`)                                                                                                                                                                         |
| cacheTo                 | false    | Specify the image to cache the built image to                                                                                                                                                                                             |
| platform                  | false    | Platforms for which the image should be built. If omitted, defaults to the platform of the GitHub Actions Runner. Multiple platforms should be comma separated.                                                                                                                                                                          |
| cliVersion                | false    | The version of the [devcontainers CLI](https://github.com/devcontainers/cli) to use                                                                                                                                                                           |

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
      - name: Build and run dev container task
        uses: devcontainers/ci@v0.3
        with:
          subFolder: folderB
          imageName: ghcr.io/example/example-devcontainer
          runCmd: make ci-build
```

## Environment Variables

If you want to pass additional environment variables to the dev container when it is run, you can use the `env` input as shown below.


```yaml
      - name: Build and run dev container task
        uses: devcontainers/ci@v0.3
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

The environment variables specified in the workflow step are passed along when the run-command is executed. Therefore, they replace environment variables with the same name that are set either directly in the Dockerfile or the `devcontainer.json` under the [`containerEnv`](https://code.visualstudio.com/remote/advancedcontainers/environment-variables#_option-1-add-individual-variables) key.

### remoteEnv

If you have environment variables set in the `remoteEnv` section of your `devcontainer.json` file using `localEnv` references, you need to pass the environment variables in a specific way.

Since `localEnv` references are resolved by the `devcontainer` CLI, we need to ensure that we set the values in the correct context for `localEnv`. To do this, the values should be set using the `env` property on the action, not using the `env` nested under the `with` block.

For example, if you have the following section in your `devcontainer.json`:

```json
{
    "remoteEnv": {
        "HELLO": "${localEnv:HELLO}"
    }
}
```

You should set the `HELLO` environment variable using the `env` property on the action, not using the `env` nested under the `with` block.

```yaml
      - name: Build and run dev container task
        uses: devcontainers/ci@v0.3
        env:
          # Set HELLO here so that it is resolved via the localEnv context
          HELLO: hello
        with:
          imageName: ghcr.io/example/example-devcontainer
          runCmd: echo "$HELLO"
          # Don't use the env block here to set the HELLO environment variable
          # as it will be overridden by the value from localEnv context
          # when the CLI starts the container
```

## Multi-Platform Builds

Builds for multiple platforms have special considerations, detailed at [mutli-platform-builds.md](multi-platform-builds.md).
