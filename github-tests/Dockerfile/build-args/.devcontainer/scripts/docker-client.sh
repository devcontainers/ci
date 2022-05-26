#!/bin/bash 
set -e

VERSION=${1:-"20.10.5"}
INSTALL_DIR=${2:-"$HOME/.local/bin"}
CMD=docker
NAME="Docker Client"

echo -e "\e[34m»»» 📦 \e[32mInstalling \e[33m$NAME \e[35mv$VERSION\e[0m ..."

mkdir -p $INSTALL_DIR
curl -sSL https://download.docker.com/linux/static/stable/x86_64/docker-$VERSION.tgz -o /tmp/docker.tgz
tar -zxvf /tmp/docker.tgz -C /tmp docker/docker
chmod +x /tmp/docker/docker
mv /tmp/docker/docker $INSTALL_DIR/docker
rmdir /tmp/docker/
rm -rf /tmp/docker.tgz

echo -e "\n\e[34m»»» 💾 \e[32mInstalled to: \e[33m$(which $CMD)"
echo -e "\e[34m»»» 💡 \e[32mVersion details: \e[39m$($CMD --version)"
