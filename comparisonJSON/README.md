# Aplicação Chat - Versão JSON

Versão equivalente da aplicação de chat original que utiliza comunicação via JSON/HTTP em vez de gRPC/protobuf.

## Estrutura

- **Frontend**: Interface React idêntica a do gRPC
- **Central**: Servidor central em C++ que recebe requisições HTTP do frontend e se comunica via JSON com os outros serviços
- **ServerA**: Servidor em JavaScript que gerencia fóruns e mensagens via HTTP/JSON
- **ServerB**: Servidor em Python que verifica palavras proibidas via HTTP/JSON

## Diferenças da Versão Original

### Comunicação
- **Original**: gRPC com protobuf
- **JSON**: HTTP REST API com JSON

### Portas
- **Central**: 8080
- **ServerA**: 3001
- **ServerB**: 3002

### Dependências
- **Central**: libcurl + nlohmann/json (em vez de gRPC)
- **ServerA**: Express.js (em vez de @grpc/grpc-js)
- **ServerB**: Flask (em vez de grpcio)

## Como Executar

### Usando Docker Compose
```bash
cd comparisonJSON
docker compose up --build
```

### Manualmente

1. **ServerB (Python)**:
```bash
cd serverB
pip install -r requirements.txt
python server_b.py
```

2. **ServerA (JavaScript)**:
```bash
cd serverA
npm install
npm start
```

3. **Central (C++)**:
```bash
sudo apt-get install libcurl4-openssl-dev nlohmann-json3-dev build-essential pkg-config cmake
cd central
mkdir build && cd build
cmake ..
make
./central
```

4. **Frontend**:
```bash
cd frontend
npm install
npm run dev
```