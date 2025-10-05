cmake_minimum_required(VERSION 3.5)
project(central)

set(CMAKE_CXX_STANDARD 17)

find_package(PkgConfig REQUIRED)
pkg_check_modules(CURL REQUIRED libcurl)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_executable(central central.cpp)

target_link_libraries(central
  ${CURL_LIBRARIES}
  pthread
)

target_include_directories(central PRIVATE ${CURL_INCLUDE_DIRS})
target_compile_options(central PRIVATE ${CURL_CFLAGS_OTHER})