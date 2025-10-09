from concurrent import futures
from datetime import datetime, timezone
import time
import grpc
import exemplo_pb2
import exemplo_pb2_grpc

class ExemploServiceServicer(exemplo_pb2_grpc.ExemploServiceServicer):
    def Dobro(self, request, context):
        valor = request.valor
        mensagem = f"Dobro de {valor} é {valor * 2}"
        return exemplo_pb2.Resultado(mensagem=mensagem)

    def Tabuada(self, request, context):
        n = request.valor
        for i in range(1, 11):
            yield exemplo_pb2.Resultado(mensagem=f"{n} x {i} = {n * i}")

    def Media(self, request_iterator, context):
        soma = 0
        count = 0
        for numero in request_iterator:
            soma += numero.valor
            count += 1
        media = (soma / count) if count > 0 else 0.0
        return exemplo_pb2.Resultado(mensagem=f"Média calculada: {media}")

    def Conversa(self, request_iterator, context):
        for msg in request_iterator:
            texto = msg.texto or ""
            comprimento = len(texto)
            palavras = len(texto.split())
            reverso = texto[::-1]
            ts = datetime.now(timezone.utc).isoformat()

            resposta_texto = (
                f"Orig: {texto} | Len: {comprimento}"
            )
            yield exemplo_pb2.Mensagem(texto=resposta_texto)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    exemplo_pb2_grpc.add_ExemploServiceServicer_to_server(ExemploServiceServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("Servidor rodando em 0.0.0.0:50051")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        print("Servidor encerrando...")
        server.stop(0)

if __name__ == '__main__':
    serve()

