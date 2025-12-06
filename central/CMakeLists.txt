cmake_minimum_required(VERSION 3.5)
project(central)

set(CMAKE_CXX_STANDARD 17)

find_package(Protobuf REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(GRPC++ REQUIRED grpc++)

find_package(prometheus-cpp REQUIRED)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_executable(central central.cpp chat.pb.cc chat.grpc.pb.cc)

target_link_libraries(central
  ${GRPC++_LIBRARIES}
  ${Protobuf_LIBRARIES}
  prometheus-cpp::core
  prometheus-cpp::pull  # Necessário para o Exposer
)

target_include_directories(central PRIVATE ${GRPC++_INCLUDE_DIRS})
target_compile_options(central PRIVATE ${GRPC++_CFLAGS_OTHER})
