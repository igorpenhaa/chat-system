FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ARG GRPC_VERSION=1.56.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential autoconf libtool git wget curl apt-utils \
    libprotobuf-dev libre2-dev pkg-config cmake make \
    protobuf-compiler libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN git clone --recurse-submodules -b v${GRPC_VERSION} https://github.com/grpc/grpc.git /tmp/grpc && \
    mkdir -p /tmp/grpc/cmake/build && cd /tmp/grpc/cmake/build && \
    cmake ../.. -DgRPC_INSTALL=ON -DgRPC_BUILD_TESTS=OFF && \
    make -j$(nproc) && make install && ldconfig && \
    cp grpc_cpp_plugin /usr/local/bin/ && \
    rm -rf /tmp/grpc

WORKDIR /app

COPY . /app
#COPY ../chat.proto /app/chat.proto

RUN protoc -I. --cpp_out=./ chat.proto
RUN protoc -I. --grpc_out=./ --plugin=protoc-gen-grpc=$(which grpc_cpp_plugin) chat.proto

RUN rm -rf build && mkdir build && cd build && cmake .. && make -j$(nproc)

WORKDIR /app/build

EXPOSE 8080
CMD ["./central"]
