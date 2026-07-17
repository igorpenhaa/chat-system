# Chat System - Plataforma de microsserviços gRPC distribuída com observabilidade no Kubernetes

Este projeto demonstra a implantação, instrumentação e avaliação de desempenho de uma arquitetura de microsserviços distribuída, executada em um cluster Kubernetes com múltiplos nós.

O sistema é composto por:

- Gateway de API em C++ (sem estado)
- Serviço de mensagens em Node.js
- Serviço de moderação de conteúdo em Python
- Redis para estado compartilhado
- Frontend em React
- Prometheus + Grafana para observabilidade
- Locust para testes de carga

---

## Arquitetura

```
Client
   ↓
React Frontend
   ↓
C++ Central (Stateless API Gateway)
   ↓
gRPC
   ↓
Server A (Node.js - Messaging)
   ↓
Redis (Shared State)
   ↑
Server B (Python - Content Moderation)
```

---

## Pré-requisitos
<!-- ### Geral

* Ubuntu 20.04+ (ou outra distro Linux)
* CMake 3.10+
* g++ 10+
* Node.js 18+
* Python 3.8+
* pip -->

### Dependências

#### React.js (Front-End)

```bash
# Instalar Node.js 20+ (recomendado usar nvm)
nvm use 20
npm install
```

#### C++ (Central)

* gRPC C++
* Protobuf C++

Se ainda não tiver:

```bash
sudo apt update
sudo apt install build-essential autoconf libtool pkg-config cmake git curl -y
```

#### Node.js (Server A)

```bash
cd serverA
npm install @grpc/grpc-js @grpc/proto-loader
```

#### Python (Server B)

```bash
cd serverB
python3 -m venv venv
source venv/bin/activate
pip install grpcio grpcio-tools
```

---

## Passo a passo para rodar sem kubernets

### 1 - Gerar arquivos gRPC / Protobuf

Na raiz do projeto:

```bash
# Para C++
protoc -I. --cpp_out=central chat.proto
protoc -I. --grpc_out=central --plugin=protoc-gen-grpc=$(which grpc_cpp_plugin) chat.proto

# Para Python
cd serverB
python -m grpc_tools.protoc -I../ --python_out=. --grpc_python_out=. ../chat.proto
cd ..
```

Para Node.js, não é necessário gerar código separado, será carregado via `@grpc/proto-loader`.

---

### 2 - Compilar a central C++

```bash
cd central
mkdir build && cd build
cmake ..
make -j
```

Isso cria o executável `central` na pasta build.

---

### 3 - Rodar os servidores

#### Server B (Python)

```bash
cd serverB
source venv/bin/activate
python server_b.py
```

#### Server A (Node.js)

```bash
cd serverA
node server_a.js
```

#### Central (C++)

```bash
cd central/build
./central
```

#### Front-End (React.js)
```bash
cd frontend
npm run dev
```

---

## Passo a passo com Kubernets

Seguir o how-to-run.txt, além de ter a aplicação funcional também terá acesso ao prometheus e ao grafana para monitorar a aplicação rodando

---

### Referências

* [gRPC C++](https://grpc.io/docs/languages/cpp/)
* [gRPC Node.js](https://grpc.io/docs/languages/node/)
* [gRPC Python](https://grpc.io/docs/languages/python/)

