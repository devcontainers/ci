#!/bin/bash
set -e

get_latest_release() {
  curl --silent "https://golang.org/dl/" | grep -Po -m 1 '(\d+\.\d+\.\d+)\.linux-amd64' | sed 's/.linux-amd64//'
}

VERSION=${1:-"$(get_latest_release)"}
INSTALL_DIR=${2:-"$HOME/.local/bin"}
CMD=go
NAME="Go Language"

echo -e "\e[34m»»» 📦 \e[32mInstalling \e[33m$NAME \e[35mv$VERSION\e[0m ..."

cd /tmp
curl -fsS https://dl.google.com/go/go${VERSION}.linux-amd64.tar.gz -o golang.tar.gz

sudo tar -xvf golang.tar.gz
sudo rm -rf /usr/local/go
rm -rf /tmp/golang.tar.gz
sudo mv go /usr/local

echo -e "\n\e[34m»»» 💾 \e[32mInstalled to: \e[33m$(which $CMD)"
echo -e "\e[34m»»» 💡 \e[32mVersion details: \e[39m$($CMD version)"
