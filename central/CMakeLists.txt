cmake_minimum_required(VERSION 3.5)
project(central)

set(CMAKE_CXX_STANDARD 17)

find_package(Protobuf REQUIRED)
find_package(gRPC CONFIG REQUIRED)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_executable(central central.cpp chat.pb.cc chat.grpc.pb.cc)

target_link_libraries(central
  gRPC::grpc++
  protobuf::libprotobuf
)
