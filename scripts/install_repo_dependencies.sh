#!/bin/bash

# Exit on error
set -e

SCRIPT=$(realpath "$0")
SOURCE=$(dirname "$SCRIPT")
PROJECT_ROOT=$(realpath ${SOURCE}/..)

source "${PROJECT_ROOT}/scripts/dependency_install_functions.sh"

packages=("libtool" "wget" "build-essential" "g++" "gcc" "libboost-all-dev" "pkg-config" "autoconf" "automake" "make" "unzip" "git" "python3-pkg-resources" "libssl-dev" "libzmq3-dev" "python3-pip")
externals=("cmake" "protobuf" "libzmq")

if [ $# -eq 1 ]; then
  case "$1" in
    -h|--help)
      # If -h or --help is provided, print help
      echo "Usage: $0 [-h|--help] [unify]"
      ;;
    unify)
      # If 'unify' is provided, print the packages
      echo -n "${packages[@]} " >> "$apt_file_path"
      echo -n "${externals[@]} " >> "$ext_file_path"
      ;;
    *)
      # If any other argument is provided, install the packages
      sudo apt-get update
      sudo dpkg --configure -a
      sudo apt-get install -y "${packages[@]}"

      python3 -m pip install --upgrade pip
      python3 -m pip install setuptools

      for "$ext" in "${externals[@]}"; do
        install_dep_by_name "$ext"
      done
      ;;
  esac
fi

