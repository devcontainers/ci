# [Choice] Debian / Ubuntu version: debian-10, debian-9, ubuntu-20.04, ubuntu-18.04
# See https://github.com/microsoft/vscode-dev-containers/tree/master/containers/debian
ARG VARIANT=debian-12
FROM mcr.microsoft.com/vscode/devcontainers/base:${VARIANT}


# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Set env for tracking that we're running in a devcontainer
ENV DEVCONTAINER=true

RUN mkdir -p ~/.local/bin 
ENV PATH /root/.local/bin:$PATH

# Configure apt, install packages and general tools
RUN sudo apt-get update \
    && sudo apt-get -y install --no-install-recommends apt-utils dialog nano bash-completion sudo bsdmainutils \
    #
    # Verify git, process tools, lsb-release (common in install instructions for CLIs) installed
    && sudo apt-get -y install git iproute2 procps lsb-release figlet build-essential

# Set env for tracking that we're running in a devcontainer
ENV DEVCONTAINER=true

# golang
COPY scripts/golang.sh /tmp/
RUN /tmp/golang.sh

# Set up GOPATH
ENV GOPATH /root/go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH

# docker-client
COPY scripts/docker-client.sh /tmp/
RUN /tmp/docker-client.sh

# __DEVCONTAINER_SNIPPET_INSERT__ (control where snippets get inserted using the devcontainer CLI)

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog
