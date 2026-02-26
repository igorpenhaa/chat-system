from concurrent import futures
import grpc
import time
import chat_pb2, chat_pb2_grpc
from prometheus_client import start_http_server, Counter, Summary

BANNED_WORDS = ["spam", "ofensa", "flamengo"]

# Definicao das Metricas
# Contador para o total de requisicoes de checagem
REQUEST_COUNT = Counter(
    'checker_requests_total',
    'Total de requisições recebidas pelo Checker (Server B)',
    ['result']  # Rotulo para diferenciar 'allowed' e 'blocked'
)

CHECK_LATENCY = Summary(
    'checker_latency_seconds',
    'Latência de processamento da função CheckMessage'
)

class Checker(chat_pb2_grpc.CheckerServicer):
    @CHECK_LATENCY.time()
    def CheckMessage(self, request, context):
        text = (request.text or "").lower()
        is_allowed = True
        reason = "OK"
        for w in BANNED_WORDS:
            if w in text:
                print(f"Mensagem bloqueada, contém '{w}'!")
                is_allowed = False
                reason = f"Contém '{w}'"
                break;
		# metrica:incrementar o contador com o resultado (allowed/blocked)
        if is_allowed:
            REQUEST_COUNT.labels('allowed').inc()
        else:
            REQUEST_COUNT.labels('blocked').inc()
        return chat_pb2.CheckResponse(allowed=is_allowed, reason=reason)

def serve():
    # Iniciar o HTTP do prometheus, rodara em uma thread separada, expondo o endpoint /metrics
    start_http_server(8000)
    print("Prometheus Metrics Server running on 8000")

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    chat_pb2_grpc.add_CheckerServicer_to_server(Checker(), server)
    server.add_insecure_port('[::]:50052')
    server.start()
    print("Server B (checker) running on 50052")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()

