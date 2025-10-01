from concurrent import futures
import grpc
import time
import chat_pb2, chat_pb2_grpc

BANNED_WORDS = ["spam", "ofensa", "flamengo"]

class Checker(chat_pb2_grpc.CheckerServicer):
    def CheckMessage(self, request, context):
        text = (request.text or "").lower()
        for w in BANNED_WORDS:
            if w in text:
                print(f"Mensagem bloqueada, contém '{w}'!")
                return chat_pb2.CheckResponse(allowed=False, reason=f"Contém '{w}'")
        return chat_pb2.CheckResponse(allowed=True, reason="OK")

def serve():
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

