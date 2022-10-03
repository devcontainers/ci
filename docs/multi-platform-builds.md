# Multiplatform Devcontainer Builds

Building devcontainers to support multiple platforms (aka CPU architectures) is possible with the devcontainers GitHub Action/Azure DevOps Task, but requires other actions/tasks to be run beforehand and has several caveats.

## General Notes/Caveats

- Multiplatform builds utilize emulation to build on architectures not native to the system the build is running on. This will significantly increase build times over native, single architecture builds.
- If you are using runCmd, the command will only be run on the architecure of the system the build is running on. This means that, if you are using runCmd to test the image, there may be bugs on the alternate platforms that will not be caught by your test suite. Manual post-build testing is advised.
- As of October 2022, all hosted servers for GitHub Actions and Azure Pipelines are x86_64 only. If you want to automatically run runCmd-based tests on your devcontainer on another architecure, you'll need a self-hosted runner on that architecture. It is possible that there will be future support for hosted arm64 machines, see [here for a tracking issue for Linux](https://github.com/actions/runner-images/issues/5631).

## GitHub Actions Example

```

```

## Azure DevOps Task Example

```

```
