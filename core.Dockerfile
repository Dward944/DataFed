ARG           BUILD_BASE="ubuntu:focal"
ARG         DEPENDENCIES="dependencies"
ARG              RUNTIME="runtime"
ARG          DATAFED_DIR="/datafed"
ARG DATAFED_INSTALL_PATH="$DATAFED_DIR/install"
ARG            GCS_IMAGE="code.ornl.gov:4567/dlsw/datafed/gcs-ubuntu-focal"
ARG            BUILD_DIR="$DATAFED_DIR/source"
ARG              NVM_DIR="$DATAFED_DIR/.nvm"
ARG              NVM_INC="$DATAFED_DIR/.nvm/versions/node/v13.14.0/include/node"
ARG              NVM_BIN="$DATAFED_DIR/.nvm/versions/node/v13.14.0/bin"
ARG              LIB_DIR="/usr/local/lib"

FROM ${DEPENDENCIES} AS core-build

ARG DATAFED_DIR
ARG BUILD_DIR
ARG DATAFED_INSTALL_PATH

# For communicating with repo server
EXPOSE 7512
# For listening to web server
EXPOSE 7513
# ArangoDB port
EXPOSE 8529

COPY ./core/CMakeLists.txt             ${BUILD_DIR}/core/CMakeLists.txt
COPY ./CMakeLists.txt                  ${BUILD_DIR}
COPY ./scripts/dependency_versions.sh  ${BUILD_DIR}/scripts/
COPY ./scripts/generate_datafed.sh     ${BUILD_DIR}/scripts/
COPY ./scripts/generate_core_config.sh ${BUILD_DIR}/scripts/
COPY ./scripts/install_core.sh         ${BUILD_DIR}/scripts/
COPY ./cmake                           ${BUILD_DIR}/cmake
COPY ./core/docker/entrypoint.sh       ${BUILD_DIR}/core/docker/
COPY ./core/server                     ${BUILD_DIR}/core/server

# All files should be owned by the datafed user
# RUN chown -R datafed:datafed ${DATAFED_DIR}
#
# USER datafed

RUN ${BUILD_DIR}/scripts/generate_datafed.sh && \
	cmake -S. -B build						\
		-DBUILD_REPO_SERVER=False		\
		-DBUILD_AUTHZ=False					\
		-DBUILD_CORE_SERVER=True		\
		-DBUILD_WEB_SERVER=False		\
		-DBUILD_DOCS=False					\
		-DBUILD_PYTHON_CLIENT=False	\
		-DBUILD_FOXX=False
RUN cmake --build build -j 8
RUN cmake --build build --target install

FROM ${RUNTIME} AS core

ARG DATAFED_DIR
ARG DATAFED_INSTALL_PATH
ARG BUILD_DIR
ARG LIB_DIR

# The above should also be available at runtime
ENV DATAFED_INSTALL_PATH="$DATAFED_INSTALL_PATH"
ENV          DATAFED_DIR="$DATAFED_DIR"
ENV            BUILD_DIR="$BUILD_DIR"
ENV              LIB_DIR="$LIB_DIR"

# copy necessary shared libraries
COPY --from=core-build /libraries/libprotobuf.so           /libraries/libprotobuf.so
COPY --from=core-build /libraries/libzmq.so                /libraries/libzmq.so
COPY --from=core-build /libraries/libsodium.so             /libraries/libsodium.so
COPY --from=core-build /libraries/libboost_program_options.so /libraries/libboost_program_options.so
RUN ${BUILD_DIR}/scripts/copy_dependency.sh protobuf to
RUN ${BUILD_DIR}/scripts/copy_dependency.sh libzmq to
RUN ${BUILD_DIR}/scripts/copy_dependency.sh libsodium to
RUN ${BUILD_DIR}/scripts/copy_dependency.sh boost_program_options to

RUN ldconfig

USER datafed

COPY --chown=datafed:datafed ./scripts/generate_datafed.sh     ${DATAFED_DIR}/scripts/generate_datafed.sh
COPY --chown=datafed:datafed ./scripts/generate_core_config.sh ${DATAFED_DIR}/scripts/generate_core_config.sh
COPY --chown=datafed:datafed ./scripts/install_core.sh         ${DATAFED_DIR}/scripts/install_core.sh
COPY --chown=datafed:datafed ./cmake/Version.cmake             ${DATAFED_DIR}/cmake/Version.cmake
COPY --from=core-build --chown=datafed:datafed ${BUILD_DIR}/core/docker/entrypoint.sh    ${BUILD_DIR}/core/entrypoint.sh
COPY --from=core-build --chown=datafed:datafed ${DATAFED_INSTALL_PATH}/core/datafed-core ${DATAFED_INSTALL_PATH}/core/datafed-core

# ENTRYPOINT ["/app/entrypoint.sh"]
# CMD ["/app/datafed-core","--cfg","/app/datafed-core.cfg"]
