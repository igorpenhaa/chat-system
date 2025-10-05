FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake pkg-config \
    libgrpc++-dev libprotobuf-dev protobuf-compiler-grpc \
    protobuf-compiler && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY chat.proto CMakeLists.txt central.cpp ./

RUN protoc -I. --cpp_out=. --grpc_out=. --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` chat.proto

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgrpc++1 libprotobuf23 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/central ./

EXPOSE 8080

CMD ["./central"]
