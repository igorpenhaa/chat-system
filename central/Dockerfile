FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
ARG GRPC_VERSION=1.56.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential autoconf libtool pkg-config cmake git curl wget ca-certificates \
    lsb-release gnupg \
    protobuf-compiler \
    libprotobuf-dev \
    libssl-dev \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgrpc++-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app
#COPY ../chat.proto /app/chat.proto

RUN mkdir -p build && cd build && cmake .. && make -j$(nproc)

WORKDIR /app/build

EXPOSE 8080
CMD ["./central"]

