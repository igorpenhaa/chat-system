# cliente.py
import sys
import time
import threading
import queue
import grpc
import exemplo_pb2
import exemplo_pb2_grpc

def test_unary(stub, valor=7):
    req = exemplo_pb2.Numero(valor=valor)
    resp = stub.Dobro(req)
    print("Resposta:", resp.mensagem)

def test_server_streaming(stub, valor=5):
    req = exemplo_pb2.Numero(valor=valor)
    for res in stub.Tabuada(req):
        print("Stream:", res.mensagem)

def test_client_streaming(stub, valores=None):
    if valores is None:
        valores = [10, 20, 30, 40, 50]
    def gen():
        for v in valores:
            print("Enviando:", v)
            yield exemplo_pb2.Numero(valor=v)
            time.sleep(0.1)
    resp = stub.Media(gen())
    print("Resposta:", resp.mensagem)
def test_bidi_streaming(stub):
        def gen():
            while True:
                texto = input("> ")
                if texto.strip().lower() == "/exit":
                    break
                yield exemplo_pb2.Mensagem(texto=texto)
    
        for resp in stub.Conversa(gen()):
            print("Resposta do servidor:", resp.texto)


if __name__ == '__main__':
    channel = grpc.insecure_channel('localhost:50051')
    stub = exemplo_pb2_grpc.ExemploServiceStub(channel)

    if len(sys.argv) < 2:
        print("Uso: python cliente.py [unary|server|client|bidi] [opcional:valor]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == 'unary':
        valor = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        test_unary(stub, valor)
    elif cmd == 'server':
        valor = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        test_server_streaming(stub, valor)
    elif cmd == 'client':
        # exemplo: python cliente.py client -> usa valores default
        test_client_streaming(stub)
    elif cmd == 'bidi':
        test_bidi_streaming(stub)
    else:
        print("Comando desconhecido. Use: unary, server, client, bidi")

