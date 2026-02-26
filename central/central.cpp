#include <iostream>
#include <memory>
#include <thread>
#include <vector>
#include <map>
#include <sstream>
#include <algorithm>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <grpcpp/grpcpp.h>
#include "chat.grpc.pb.h"
#include <chrono>
#include <prometheus/exposer.h>
#include <prometheus/registry.h>
#include <prometheus/counter.h>
#include <prometheus/histogram.h>

using grpc::Channel;
using grpc::ClientContext;
using grpc::Status;
using chat::Message;
using chat::Checker;
using chat::CheckResponse;
using chat::ChatServer;
using chat::Empty;
using chat::HistoryRequest;
using chat::HistoryResponse;

// Configuração Prometheus
std::shared_ptr<prometheus::Registry> registry = std::make_shared<prometheus::Registry>();
const prometheus::Histogram::BucketBoundaries buckets{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0};
prometheus::Family<prometheus::Histogram>& http_request_duration = prometheus::BuildHistogram().Name("central_http_request_duration_seconds").Help("HTTP Latency").Register(*registry);

class Central {
public:
    Central(std::shared_ptr<Channel> a, std::shared_ptr<Channel> b)
      : stubA(ChatServer::NewStub(a)), stubB(Checker::NewStub(b)) {}

    bool SendMessage(const std::string& username, const std::string& forum_id, const std::string& text) {
        // Se o forum_id estiver vazio, rejeita ou define um padrão para evitar mistura de mensagens
        if (forum_id.empty()) {
            std::cout << "Erro: Tentativa de enviar mensagem sem forum_id." << std::endl;
            return false;
        }

        ClientContext ctx;
        CheckResponse resp;
        Message msg;
        msg.set_username(username);
        msg.set_forum_id(forum_id);
        msg.set_text(text);

        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
        msg.set_timestamp(timestamp);

        Status s = stubB->CheckMessage(&ctx, msg, &resp);
        if (!s.ok() || !resp.allowed()) {
            std::cout << "Message blocked: " << (s.ok() ? resp.reason() : s.error_message()) << std::endl;
            return false;
        }

        ClientContext ctxA;
        Empty respA;
        Status sA = stubA->SendMessage(&ctxA, msg, &respA);

        if (!sA.ok()) {
            std::cerr << "Failed to send to Server A: " << sA.error_message() << std::endl;
            return false;
        }
        return true;
    }

    std::string GetForumMessagesJson(const std::string& forum_id) {
        ClientContext ctx;
        HistoryRequest req;
        req.set_forum_id(forum_id);
        HistoryResponse resp;

        Status s = stubA->GetHistory(&ctx, req, &resp);

        std::ostringstream json;
        json << "{\"success\":true,\"data\":[";

        if (s.ok()) {
            for (int i = 0; i < resp.messages_size(); i++) {
                const auto& m = resp.messages(i);
                if (i > 0) json << ",";
                json << "{\"username\":\"" << m.username() << "\","
                     << "\"content\":\"" << m.text() << "\","
                     << "\"timestamp\":\"" << m.timestamp() << "\"}";
            }
        }
        json << "]}";
        return json.str();
    }

private:
    std::unique_ptr<ChatServer::Stub> stubA;
    std::unique_ptr<Checker::Stub> stubB;
};

class HTTPServer {
private:
    int server_fd;
    Central* central;

    // Headers de Cache-Control para evitar cache no navegador
    std::string create_json_response(const std::string& content, int status_code = 200) {
        std::ostringstream response;
        response << "HTTP/1.1 " << status_code << " OK\r\n"
                 << "Content-Type: application/json\r\n"
                 << "Access-Control-Allow-Origin: *\r\n"
                 << "Cache-Control: no-store, no-cache, must-revalidate\r\n" // Importante!
                 << "Pragma: no-cache\r\n"
                 << "Content-Length: " << content.length() << "\r\n\r\n"
                 << content;
        return response.str();
    }

    // Parser JSON que ignora espaços
    std::string parse_json_field(const std::string& json, const std::string& field) {
        std::string key = "\"" + field + "\"";
        size_t keyPos = json.find(key);
        if (keyPos == std::string::npos) return "";

        // Procura pelos dois pontos apos a chave
        size_t colonPos = json.find(":", keyPos);
        if (colonPos == std::string::npos) return "";

        // Procura a aspa de abertura do valor
        size_t startQuote = json.find("\"", colonPos);
        if (startQuote == std::string::npos) return "";

        // Procura a aspa de fechamento
        size_t endQuote = json.find("\"", startQuote + 1);
        if (endQuote == std::string::npos) return "";

        return json.substr(startQuote + 1, endQuote - startQuote - 1);
    }

    void handle_request(int client_socket) {
        auto start = std::chrono::steady_clock::now();
        char buffer[4096] = {0};
        read(client_socket, buffer, 4096);
        std::string request(buffer);
        std::istringstream stream(request);
        std::string method, path;
        stream >> method >> path;

        std::string path_only = path.substr(0, path.find('?'));

        if (method == "OPTIONS") {
             std::string r = create_json_response("");
             send(client_socket, r.c_str(), r.length(), 0);
             close(client_socket);
             return;
        }

        if (method == "POST" && path == "/api/messages/send") {
            size_t body_pos = request.find("\r\n\r\n");
            if (body_pos != std::string::npos) {
                std::string body = request.substr(body_pos + 4);

                // Tenta buscar "forumCode", se falhar tenta "forum_id" (caso o front mande diferente)
                std::string forum = parse_json_field(body, "forumCode");
                if (forum.empty()) forum = parse_json_field(body, "forum_id");

                std::string user = parse_json_field(body, "username");
                std::string text = parse_json_field(body, "content");

                // Validação extra
                if (forum.empty()) {
                    std::cout << "AVISO: Recebido POST sem forumCode valido. Body: " << body << std::endl;
                    send_json(client_socket, "{\"success\":false, \"error\":\"missing forumCode\"}", 400);
                } else if (central->SendMessage(user, forum, text)) {
                    send_json(client_socket, "{\"success\":true}");
                } else {
                    send_json(client_socket, "{\"success\":false}", 400);
                }
            }
        }
        else if (method == "GET" && path.rfind("/api/messages", 0) == 0) {
            size_t pos = path.find("forumCode=");
            if (pos != std::string::npos) {
                std::string forum = path.substr(pos + 10);
                size_t end = forum.find('&');
                if (end != std::string::npos) forum = forum.substr(0, end);

                // Remove espaços em branco ou quebras de linha residuais na URL
                forum.erase(std::remove_if(forum.begin(), forum.end(), ::isspace), forum.end());

                std::string json = central->GetForumMessagesJson(forum);
                std::string resp = create_json_response(json);
                send(client_socket, resp.c_str(), resp.length(), 0);
            } else {
                send_json(client_socket, "{\"error\":\"missing forumCode\"}", 400);
            }
        }
        else if (method == "POST" && path == "/api/forum/join") {
             send_json(client_socket, "{\"success\":true}");
        }
        else {
             send_json(client_socket, "{\"error\":\"not found\"}", 404);
        }

        auto end = std::chrono::steady_clock::now();
        std::chrono::duration<double> elapsed = end - start;
        http_request_duration.Add({{"method", method}, {"route", path_only}}, buckets).Observe(elapsed.count());

        close(client_socket);
    }

    void send_json(int socket, std::string json, int code = 200) {
        std::string r = create_json_response(json, code);
        send(socket, r.c_str(), r.length(), 0);
    }

public:
    HTTPServer(Central* c) : central(c) {}
    void start(int port) {
        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        int opt = 1;
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
        struct sockaddr_in addr;
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = INADDR_ANY;
        addr.sin_port = htons(port);
        bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));
        listen(server_fd, 10);

        prometheus::Exposer exposer("0.0.0.0:8000");
        exposer.RegisterCollectable(registry);

        std::cout << "Central running on 8080. Metrics on 8000." << std::endl;
        while(true) {
            struct sockaddr_in cli; socklen_t len = sizeof(cli);
            int sock = accept(server_fd, (struct sockaddr*)&cli, &len);
            if (sock >= 0) std::thread(&HTTPServer::handle_request, this, sock).detach();
        }
    }
};

int main() {
    std::string sA = "dns:///servera.chat-system.svc.cluster.local:50051";
    std::string sB = "dns:///serverb.chat-system.svc.cluster.local:50052";

    if (std::getenv("SERVER_A_ADDRESS")) sA = std::getenv("SERVER_A_ADDRESS");
    if (std::getenv("SERVER_B_ADDRESS")) sB = std::getenv("SERVER_B_ADDRESS");

    Central central(
        grpc::CreateChannel(sA, grpc::InsecureChannelCredentials()),
        grpc::CreateChannel(sB, grpc::InsecureChannelCredentials())
    );

    HTTPServer srv(&central);
    srv.start(8080);
    return 0;
}
