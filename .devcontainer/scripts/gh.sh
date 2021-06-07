#!/bin/bash 
set -e

get_latest_release() {
  curl --silent "https://api.github.com/repos/$1/releases/latest" |
  grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/'
}

VERSION=${1:-"$(get_latest_release cli/cli)"}
INSTALL_DIR=${2:-"$HOME/.local/bin"}
CMD=gh
NAME="GitHub CLI"

echo -e "\e[34m»»» 📦 \e[32mInstalling \e[33m$NAME \e[35mv$VERSION\e[0m ..."

mkdir -p $INSTALL_DIR
curl -sSL https://github.com/cli/cli/releases/download/v${VERSION}/gh_${VERSION}_linux_amd64.tar.gz -o /tmp/gh.tar.gz
tar -zxvf /tmp/gh.tar.gz --strip-components 2 -C $INSTALL_DIR gh_${VERSION}_linux_amd64/bin/gh > /dev/null
chmod +x $INSTALL_DIR/gh
rm -rf /tmp/gh.tar.gz

echo -e "\n\e[34m»»» 💾 \e[32mInstalled to: \e[33m$(which $CMD)"
echo -e "\e[34m»»» 💡 \e[32mVersion details: \e[39m$($CMD --version)"
