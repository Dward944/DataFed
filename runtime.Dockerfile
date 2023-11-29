ARG             DATAFED_DIR="/datafed"
ARG    DATAFED_INSTALL_PATH="$DATAFED_DIR/install"
ARG               GCS_IMAGE="code.ornl.gov:4567/dlsw/datafed/gcs-ubuntu-focal"
ARG               BUILD_DIR="$DATAFED_DIR/source"
ARG                 NVM_DIR="$DATAFED_DIR/.nvm"
ARG                 NVM_INC="$DATAFED_DIR/.nvm/versions/node/v13.14.0/include/node"
ARG                 NVM_BIN="$DATAFED_DIR/.nvm/versions/node/v13.14.0/bin"
ARG                 LIB_DIR="/usr/local/lib"

FROM ubuntu:focal

ARG DATAFED_DIR
ARG DATAFED_INSTALL_PATH
ARG BUILD_DIR

ENV BUILD_DIR="${BUILD_DIR}"
ENV DATAFED_DIR="${DATAFED_DIR}"

RUN echo $DATAFED_DIR

# Create datafed user, prefer more secure login options than password
# Recommended to mount ssh public key on run
RUN adduser --disabled-password --gecos "" datafed

COPY ./scripts/dependency_versions.sh  ${BUILD_DIR}/scripts/
COPY ./scripts/copy_dependency.sh      ${BUILD_DIR}/scripts/
RUN mkdir -p ${DATAFED_DIR}
RUN mkdir -p /opt/datafed
RUN mkdir -p /var/log/datafed
RUN chown -R datafed:datafed /opt/datafed
RUN chown -R datafed:datafed /var/log/datafed
RUN chown -R datafed:datafed ${DATAFED_DIR}
WORKDIR ${DATAFED_DIR}

RUN apt update
RUN apt install -y grep libcurl4
# ENV LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/lib:/usr/local/lib"
