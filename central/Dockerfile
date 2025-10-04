FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
ARG GRPC_VERSION=1.56.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential autoconf libtool git wget curl apt-utils \
    libgrpc++-dev libprotobuf-dev libre2-dev pkg-config cmake make \
    protobuf-compiler libgrpc-dev libprotobuf-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app
#COPY ../chat.proto /app/chat.proto

RUN protoc -I. --cpp_out=. chat.proto
RUN protoc -I. --grpc_out=. --plugin=protoc-gen-grpc=$(which grpc_cpp_plugin) chat.proto

RUN mkdir -p build && cd build && cmake .. && make -j$(nproc)

WORKDIR /app/build

EXPOSE 8080
CMD ["./central"]
