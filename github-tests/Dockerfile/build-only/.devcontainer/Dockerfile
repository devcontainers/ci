# [Choice] Debian / Ubuntu version: debian-10, debian-9, ubuntu-20.04, ubuntu-18.04
# See https://github.com/microsoft/vscode-dev-containers/tree/master/containers/debian
ARG VARIANT=debian-10
FROM mcr.microsoft.com/vscode/devcontainers/base:${VARIANT}


# Set ENTRYPOINT so that we generate an error if a container is started
ENTRYPOINT [ "exit 1" ]
