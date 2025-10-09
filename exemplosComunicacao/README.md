# Rodando o Projeto Python com gRPC

## 1. Criar e ativar o ambiente virtual

```bash
python3 -m venv venv       # cria o venv
source venv/bin/activate   # Linux/macOS
# venv\Scripts\activate    # Windows

pip install grpcio grpcio-tools
```

## Rodando a aplicação

Abra dois terminais ative o ambiente e rode um cliente e um servidor.

### terminal servidor
```bash
source venv/bin/activate
python servidor.py
```

### terminal cliente
```bash
source venv/bin/activate
python cliente.py
```

### rodando os tipos de comunicação

```bash
# Unary
python cliente.py unary [valor]

# Server streaming 
python cliente.py server [valor]

# Client streaming
python cliente.py client

# Bidirectional streaming
python cliente.py bidi
```
