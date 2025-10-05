# Chat System gRPC - Simplificado

Este projeto é um exemplo de chat distribuído usando gRPC, com uma **central C++**, um **server A em Node.js** e um **server B em Python**.

O fluxo é:

1. O **front-end** envia requisições para a **central**.
2. A **central** distribui a requisição:

   * Para o **server A (Node.js)** que mantém os fóruns e mensagens.
   * Para o **server B (Python)** que checa mensagens sensíveis.
3. O **server B** retorna aprovação ou bloqueio da mensagem.
4. O **server A** envia a mensagem para todos os usuários conectados.

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

## Passo a passo para rodar

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

### 4 - Testando

* Digite o nome do usuário, fórum e mensagens no Front-End.
* O server B checa conteúdo sensível.
* O server A mantém os fóruns e envia mensagens.
* Mensagens bloqueadas pelo checker serão informadas no terminal.

---

### Referências

* [gRPC C++](https://grpc.io/docs/languages/cpp/)
* [gRPC Node.js](https://grpc.io/docs/languages/node/)
* [gRPC Python](https://grpc.io/docs/languages/python/)

