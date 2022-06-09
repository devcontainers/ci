# devcontainer-build-run GitHub Action

devcontainer-build-run is a GitHub action aimed at making it easier to re-use a [Visual Studio Code dev container](https://code.visualstudio.com/) in a GitHub workflow.

##  Getting Started

The [`devcontainer-build-run` action](https://github.com/marketplace/actions/devcontainer-build-run) uses Docker BuildKit to perform the Docker builds as this has support for storing layer cache metadata with the image. You can use the [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action) to install this (see example below).

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
        uses: actions/checkout@v2

      - name: Build and run dev container task
        uses: devcontainers/ci@v0.2
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
        uses: devcontainers/ci@v0.2
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

## Inputs

| Name                      | Required | Description                                                                                                                                                                                                         |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imageName                 | true     | Image name to use when building the dev container image (including registry)                                                                                                                                        |
| imageTag                  | false    | Image tag to use when building/pushing the dev container image (defaults to `latest`)                                                                                                                               |
| subFolder                 | false    | Use this to specify the repo-relative path to the folder containing the dev container (i.e. the folder that contains the `.devcontainer` folder). Defaults to repo root                                             |
| runCmd                    | true     | The command to run after building the dev container image                                                                                                                                                           |
| env                       | false    | Specify environment variables to pass to the dev container when run                                                                                                                                                 |
| checkoutPath              | false    | Only used for development/testing                                                                                                                                                                                   |
| push                      | false    | Control when images are pushed. Options are `never`, `filter`, `always`. For `filter` (default), images are pushed if the `refFilterForPush` and `eventFilterForPush` conditions are met                            |
| refFilterForPush          | false    | Set the source branches (e.g. `refs/heads/main`) that are allowed to trigger a push of the dev container image. Leave empty to allow all (default)                                                                  |
| eventFilterForPush        | false    | Set the event names (e.g. `pull_request`, `push`) that are allowed to trigger a push of the dev container image. Defaults to `push`. Leave empty for all                                                            |
| skipContainerUserIdUpdate | false    | For non-root dev containers (i.e. where `remoteUser` is specified), the action attempts to make the container user UID and GID match those of the host user. Set this to true to skip this step (defaults to false) |

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
        uses: devcontainers/ci@v0.2
        with:
          subFolder: folderB
          imageName: ghcr.io/example/example-devcontainer
          runCmd: make ci-build
```

## Environment Variables

If you want to pass additional environment variables to the dev container when it is run, you can use the `env` input as shown below.


```yaml
      - name: Build and run dev container task
        uses: devcontainers/ci@v0.2
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
