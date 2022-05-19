# [Choice] Debian / Ubuntu version: debian-10, debian-9, ubuntu-20.04, ubuntu-18.04
# See https://github.com/microsoft/vscode-dev-containers/tree/master/containers/debian
ARG VARIANT=debian-10
FROM mcr.microsoft.com/vscode/devcontainers/base:${VARIANT}


# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Set env for tracking that we're running in a devcontainer
ENV DEVCONTAINER=true

# This Dockerfile adds a non-root user with sudo access. Use the "remoteUser"
# property in devcontainer.json to use it. On Linux, the container user's GID/UIDs
# will be updated to match your local UID/GID (when using the dockerFile property).
# See https://aka.ms/vscode-remote/containers/non-root-user for details.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

USER $USERNAME
RUN \
    mkdir -p ~/.local/bin \
    && echo "export PATH=\$PATH:~/.local/bin" >> ~/.bashrc

# Configure apt, install packages and general tools
RUN sudo apt-get update \
    && sudo apt-get -y install --no-install-recommends apt-utils dialog nano bash-completion sudo bsdmainutils \
    #
    # Verify git, process tools, lsb-release (common in install instructions for CLIs) installed
    && sudo apt-get -y install git iproute2 procps lsb-release figlet build-essential

# Save command line history
RUN echo "export HISTFILE=/home/$USERNAME/commandhistory/.bash_history" >> "/home/$USERNAME/.bashrc" \
    && echo "export PROMPT_COMMAND='history -a'" >> "/home/$USERNAME/.bashrc" \
    && mkdir -p /home/$USERNAME/commandhistory \
    && touch /home/$USERNAME/commandhistory/.bash_history \
    && chown -R $USERNAME /home/$USERNAME/commandhistory

# Set env for tracking that we're running in a devcontainer
ENV DEVCONTAINER=true

# node
COPY scripts/node.sh /tmp/
RUN /bin/bash /tmp/node.sh 16.x

# docker-client
COPY scripts/docker-client.sh /tmp/
RUN /bin/bash /tmp/docker-client.sh

#Add user to docker group
RUN sudo groupadd docker && sudo usermod -aG docker $USERNAME && newgrp docker

# act
COPY scripts/act.sh /tmp/
RUN /bin/bash /tmp/act.sh 0.2.21

RUN sudo npm install -g tfx-cli

# azure-cli-no-mount
COPY scripts/azure-cli.sh /tmp/
RUN /bin/bash /tmp/azure-cli.sh

RUN az extension add --name azure-devops

# __DEVCONTAINER_SNIPPET_INSERT__ (control where snippets get inserted using the devcontainer CLI)

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog
