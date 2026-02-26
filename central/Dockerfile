FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake pkg-config git curl ca-certificates \
    libgrpc++-dev libprotobuf-dev protobuf-compiler-grpc \
    protobuf-compiler zlib1g-dev libcurl4-openssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN git clone -b v1.1.0 https://github.com/jupp0r/prometheus-cpp.git && \
    cd prometheus-cpp && \
    git submodule init && git submodule update && \
    mkdir _build && cd _build && \
    cmake .. \
        -DBUILD_SHARED_LIBS=OFF \
        -DENABLE_PUSH=OFF \
        -DENABLE_COMPRESSION=OFF \
        -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make -j$(nproc) && \
    make install

WORKDIR /app

COPY chat.proto CMakeLists.txt central.cpp ./

RUN protoc -I. --cpp_out=. --grpc_out=. --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` chat.proto

RUN mkdir build && cd build && \
    cmake .. -DCMAKE_PREFIX_PATH=/usr/local && \
    make -j$(nproc)

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgrpc++1 libprotobuf23 libcurl4 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/central ./

EXPOSE 8080 8000

CMD ["./central"]
