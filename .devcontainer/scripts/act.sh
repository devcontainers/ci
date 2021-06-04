#!/bin/bash 
set -e

get_latest_release() {
  curl --silent "https://api.github.com/repos/$1/releases/latest" |
  grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/'
}

VERSION=${1:-"$(get_latest_release nektos/act)"}
INSTALL_DIR=${2:-"$HOME/.local/bin"}
CMD=act
NAME="nektos/act"

echo -e "\e[34m»»» 📦 \e[32mInstalling \e[33m$NAME v$VERSION\e[0m ..."

mkdir -p $INSTALL_DIR
curl -sSL https://github.com/nektos/act/releases/download/v${VERSION}/act_Linux_x86_64.tar.gz -o /tmp/act.tar.gz
tar -zxvf /tmp/act.tar.gz -C $INSTALL_DIR act > /dev/null
chmod +x $INSTALL_DIR/act
rm -rf /tmp/act.tar.gz

echo -e "\n\e[34m»»» 💾 \e[32mInstalled to: \e[33m$(which $CMD)"
echo -e "\e[34m»»» 💡 \e[32mVersion details: \e[39m$($CMD --version)"