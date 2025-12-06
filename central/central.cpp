#include <iostream>
#include <memory>
#include <thread>
#include <map>
#include <vector>
#include <mutex>
#include <sstream>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <grpcpp/grpcpp.h>
#include "chat.grpc.pb.h"

#include <chrono>
// Includes do Prometheus
#include <prometheus/exposer.h>
#include <prometheus/registry.h>
#include <prometheus/counter.h>
#include <prometheus/histogram.h>

using grpc::Channel;
using grpc::ClientContext;
using grpc::ClientReader;
using grpc::Status;
using chat::Message;
using chat::Checker;
using chat::CheckResponse;
using chat::ChatServer;
using chat::JoinRequest;
using chat::Empty;

// =======================================================
// CONFIGURACAO GLOBAL DO PROMETHEUS
// =======================================================
std::shared_ptr<prometheus::Registry> registry = std::make_shared<prometheus::Registry>();

// Buckets manuais para evitar erro de construtor
const prometheus::Histogram::BucketBoundaries buckets{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0};

// 1. Latencia HTTP
prometheus::Family<prometheus::Histogram>& http_request_duration = prometheus::BuildHistogram()
    .Name("central_http_request_duration_seconds")
    .Help("Duração das requisições HTTP por rota e status")
    .Register(*registry);

// 2. Contador gRPC (Total de chamadas de saida)
prometheus::Family<prometheus::Counter>& grpc_calls_total = prometheus::BuildCounter()
    .Name("central_grpc_client_calls_total")
    .Help("Total de chamadas gRPC feitas pelo Gateway para outros serviços")
    .Register(*registry);

// 3. Latencia gRPC (Tempo de resposta dos servicos backend)
prometheus::Family<prometheus::Histogram>& grpc_call_duration = prometheus::BuildHistogram()
    .Name("central_grpc_client_call_duration_seconds")
    .Help("Duração das chamadas gRPC de saída")
    .Register(*registry);

class Central {
public:
    Central(std::shared_ptr<Channel> a, std::shared_ptr<Channel> b)
      : stubA(ChatServer::NewStub(a)), stubB(Checker::NewStub(b)) {}

    bool SendMessage(const Message& msg) {
        auto start_b = std::chrono::steady_clock::now();

        ClientContext ctx;
        CheckResponse resp;
        Status s = stubB->CheckMessage(&ctx, msg, &resp);

		auto end_b = std::chrono::steady_clock::now();
        std::chrono::duration<double> elapsed_b = end_b - start_b;
        std::string status_label_b = s.ok() ? "OK" : "ERROR";

        // Registra metricas do B
        grpc_call_duration.Add({{"service", "Checker"}, {"method", "CheckMessage"}, {"status", status_label_b}}, buckets).Observe(elapsed_b.count());
        grpc_calls_total.Add({{"service", "Checker"}, {"method", "CheckMessage"}, {"status", status_label_b}}).Increment();

        if (!s.ok()) {
            std::cerr << "Checker error: " << s.error_message() << std::endl;
            return false;
        }
        if (!resp.allowed()) {
            std::cout << "Mensagem bloqueada: " << resp.reason() << std::endl;
            return false;
        }

        auto start_a = std::chrono::steady_clock::now();

		ClientContext ctxA;
        Empty respA;
        Status sA = stubA->SendMessage(&ctxA, msg, &respA);

		auto end_a = std::chrono::steady_clock::now();
        std::chrono::duration<double> elapsed_a = end_a - start_a;
        std::string status_label_a = sA.ok() ? "OK" : "ERROR";

        // Registra metricas do A
        grpc_call_duration.Add({{"service", "ChatServer"}, {"method", "SendMessage"}, {"status", status_label_a}}, buckets).Observe(elapsed_a.count());
        grpc_calls_total.Add({{"service", "ChatServer"}, {"method", "SendMessage"}, {"status", status_label_a}}).Increment();

		if (!sA.ok()) {
            std::cerr << "Failed to publish to Server A: " << sA.error_message() << std::endl;
            return false;
        } else {
            std::cerr << "Publish to Server A succeeded." << std::endl;
        }

        {
            std::lock_guard<std::mutex> lock(messages_mutex);
            forum_messages[msg.forum_id()].push_back({
                msg.username(),
                msg.text(),
                std::time(nullptr)
            });
        }

        std::cout << "Mensagem armazenada com sucesso\n";
        return true;
    }

    void StartForumStream(const std::string& username, const std::string& forum_id) {
        std::thread([this, username, forum_id]() {
			auto start_stream = std::chrono::steady_clock::now();

            ClientContext ctx;
            JoinRequest req;
            req.set_username(username);
            req.set_forum_id(forum_id);

            std::unique_ptr<ClientReader<Message>> reader = stubA->JoinForum(&ctx, req);
            if (!reader) {
                std::cerr << "[StartForumStream] reader is null immediately after JoinForum" << std::endl;
                return;
            }
            std::cerr << "[StartForumStream] JoinForum returned reader; entering read loop." << std::endl;

            Message msg;
            while (reader->Read(&msg)) {
                std::lock_guard<std::mutex> lock(messages_mutex);
                forum_messages[forum_id].push_back({
                    msg.username(),
                    msg.text(),
                    std::time(nullptr)
                });
                std::cout << "[" << forum_id << "] " << msg.username() << ": " << msg.text() << std::endl;
            }
            Status status = reader->Finish();

			auto end_stream = std::chrono::steady_clock::now();
            std::chrono::duration<double> elapsed_stream = end_stream - start_stream;
            std::string status_label = status.ok() ? "OK" : "ERROR";

            // Registra metricas do Stream (Duracao total da conexao)
            grpc_call_duration.Add({{"service", "ChatServer"}, {"method", "JoinForum"}, {"status", status_label}}, buckets).Observe(elapsed_stream.count());
            grpc_calls_total.Add({{"service", "ChatServer"}, {"method", "JoinForum"}, {"status", status_label}}).Increment();


			if (!status.ok()) {
                std::cerr << "[StartForumStream] Stream finished with error: " << status.error_message()
                          << " (code=" << status.error_code() << ")" << std::endl;
            } else {
                std::cerr << "[StartForumStream] Stream finished OK." << std::endl;
            }
        }).detach();
    }

    std::vector<std::map<std::string, std::string>> GetForumMessages(const std::string& forum_id) {
        std::lock_guard<std::mutex> lock(messages_mutex);
        std::vector<std::map<std::string, std::string>> result;

        if (forum_messages.find(forum_id) != forum_messages.end()) {
            for (const auto& msg : forum_messages[forum_id]) {
                std::map<std::string, std::string> message_obj;
                message_obj["id"] = std::to_string(msg.timestamp);
                message_obj["username"] = msg.username;
                message_obj["content"] = msg.text;
                message_obj["timestamp"] = std::to_string(msg.timestamp);
                result.push_back(message_obj);
            }
        }
        return result;
    }

private:
    struct ForumMessage {
        std::string username;
        std::string text;
        std::time_t timestamp;
    };

    std::unique_ptr<ChatServer::Stub> stubA;
    std::unique_ptr<Checker::Stub> stubB;
    std::map<std::string, std::vector<ForumMessage>> forum_messages;
    std::mutex messages_mutex;
};

class HTTPServer {
private:
    int server_fd;
    Central* central;

    std::string create_json_response(const std::string& content, int status_code = 200) {
        std::ostringstream response;
        std::string status_text = (status_code == 200) ? "OK" : "Bad Request";

        response << "HTTP/1.1 " << status_code << " " << status_text << "\r\n";
        response << "Content-Type: application/json\r\n";
        response << "Access-Control-Allow-Origin: *\r\n";
        response << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
        response << "Access-Control-Allow-Headers: Content-Type\r\n";
        response << "Content-Length: " << content.length() << "\r\n";
        response << "\r\n";
        response << content;

        return response.str();
    }

    std::string parse_json_field(const std::string& json, const std::string& field) {
        std::string search = "\"" + field + "\":\"";
        size_t start = json.find(search);
        if (start == std::string::npos) return "";
        start += search.length();
        size_t end = json.find("\"", start);
        if (end == std::string::npos) return "";
        return json.substr(start, end - start);
    }

    void handle_request(int client_socket) {
		auto start_http = std::chrono::steady_clock::now();

        char buffer[4096] = {0};
        read(client_socket, buffer, 4096);

        std::string request(buffer);
        std::istringstream request_stream(request);
        std::string method, path, version;
        request_stream >> method >> path >> version;

		// Simplifica a rota removendo query params para o Prometheus
        std::string route_label = path.substr(0, path.find('?'));

        std::cout << "Request: " << method << " " << path << std::endl;

        if (method == "OPTIONS") {
            std::string response = create_json_response("");
            send(client_socket, response.c_str(), response.length(), 0);
            close(client_socket);
            return;
        }

		int status_code = 200;

        if (method == "POST" && path == "/api/forum/join") {
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos) {
                std::string body = request.substr(body_start + 4);
                std::string username = parse_json_field(body, "username");
                std::string forum_code = parse_json_field(body, "forumCode");

                if (!username.empty() && !forum_code.empty()) {
                    std::cout << "User " << username << " joined forum " << forum_code << std::endl;
					central->StartForumStream(username, forum_code);

                    std::string json_response = "{\"success\":true,\"data\":{\"token\":\"user_" + username + "_" + forum_code + "\"}}";
                    std::string response = create_json_response(json_response);
                    send(client_socket, response.c_str(), response.length(), 0);
                } else {
					status_code = 400;
                    std::string json_response = "{\"success\":false,\"message\":\"Invalid request\"}";
                    std::string response = create_json_response(json_response, 400);
                    send(client_socket, response.c_str(), response.length(), 0);
                }
            }
        }
        else if (method == "POST" && path == "/api/messages/send") {
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos) {
                std::string body = request.substr(body_start + 4);
                std::string username = parse_json_field(body, "username");
                std::string forum_code = parse_json_field(body, "forumCode");
                std::string content = parse_json_field(body, "content");

                if (!username.empty() && !forum_code.empty() && !content.empty()) {
                    chat::Message msg;
                    msg.set_username(username);
                    msg.set_forum_id(forum_code);
                    msg.set_text(content);

                    bool success = central->SendMessage(msg);

                    if (success) {
                        std::string json_response = "{\"success\":true,\"data\":{\"id\":\"" + std::to_string(std::time(nullptr)) + "\",\"username\":\"" + username + "\",\"content\":\"" + content + "\",\"timestamp\":\"" + std::to_string(std::time(nullptr)) + "\"}}";
                        std::string response = create_json_response(json_response);
                        send(client_socket, response.c_str(), response.length(), 0);
                    } else {
						status_code = 400;
                        std::string json_response = "{\"success\":false,\"message\":\"Message blocked or failed\"}";
                        std::string response = create_json_response(json_response, 400);
                        send(client_socket, response.c_str(), response.length(), 0);
                    }
                } else {
					status_code = 400;
                    std::string json_response = "{\"success\":false,\"message\":\"Invalid message\"}";
                    std::string response = create_json_response(json_response, 400);
                    send(client_socket, response.c_str(), response.length(), 0);
                }
            }
        }
        else if (method == "GET" && path.substr(0, 13) == "/api/messages") {
            size_t query_start = path.find('?');
            std::string forum_code;
            if (query_start != std::string::npos) {
                std::string query = path.substr(query_start + 1);
                size_t forum_pos = query.find("forumCode=");
                if (forum_pos != std::string::npos) {
                    forum_pos += 10;
                    size_t end_pos = query.find('&', forum_pos);
                    if (end_pos == std::string::npos) end_pos = query.length();
                    forum_code = query.substr(forum_pos, end_pos - forum_pos);
                }
            }

            if (!forum_code.empty()) {
                auto messages = central->GetForumMessages(forum_code);
                std::ostringstream json_response;
                json_response << "{\"success\":true,\"data\":[";

                for (size_t i = 0; i < messages.size(); ++i) {
                    if (i > 0) json_response << ",";
                    json_response << "{\"id\":\"" << messages[i].at("timestamp") << "\","
                                 << "\"username\":\"" << messages[i].at("username") << "\","
                                 << "\"content\":\"" << messages[i].at("content") << "\","
                                 << "\"timestamp\":\"" << messages[i].at("timestamp") << "\"}";
                }

                json_response << "]}";
                std::string response = create_json_response(json_response.str());
                send(client_socket, response.c_str(), response.length(), 0);
            } else {
				status_code = 400;
                std::string json_response = "{\"success\":false,\"message\":\"Missing forumCode parameter\"}";
                std::string response = create_json_response(json_response, 400);
                send(client_socket, response.c_str(), response.length(), 0);
            }
        }
        else {
			status_code = 400;
            std::string json_response = "{\"success\":false,\"message\":\"Not found\"}";
            std::string response = create_json_response(json_response, 404);
            send(client_socket, response.c_str(), response.length(), 0);
        }

		auto end_http = std::chrono::steady_clock::now();
        std::chrono::duration<double> elapsed_http = end_http - start_http;

        // Registra metrica HTTP
        http_request_duration.Add({{"route", route_label}, {"method", method}, {"status", std::to_string(status_code)}}, buckets)
            .Observe(elapsed_http.count());

        close(client_socket);
    }

public:
    HTTPServer(Central* c) : central(c) {}

    void start(int port = 8080) {
        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (server_fd == -1) {
            std::cerr << "Failed to create socket" << std::endl;
            return;
        }

        int opt = 1;
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

        struct sockaddr_in address;
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = INADDR_ANY;
        address.sin_port = htons(port);

        if (bind(server_fd, (struct sockaddr*)&address, sizeof(address)) < 0) {
            std::cerr << "Bind failed" << std::endl;
            return;
        }

        if (listen(server_fd, 10) < 0) {
            std::cerr << "Listen failed" << std::endl;
            return;
        }

		// INICIA O SERVIDOR DE METRICAS (PROMETHEUS)
        prometheus::Exposer exposer("0.0.0.0:8000");
        exposer.RegisterCollectable(registry);
        std::cout << "Prometheus Metrics Exposer running on 0.0.0.0:8000/metrics" << std::endl;

        std::cout << "HTTP Server listening on port " << port << std::endl;

        while (true) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_socket = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);

            if (client_socket < 0) {
                std::cerr << "Accept failed" << std::endl;
                continue;
            }

            std::thread(&HTTPServer::handle_request, this, client_socket).detach();
        }
    }
};

int main() {
    std::string serverAAddr = std::getenv("SERVER_A_ADDRESS") ? std::getenv("SERVER_A_ADDRESS") : "localhost:50051";
    std::string serverBAddr = std::getenv("SERVER_B_ADDRESS") ? std::getenv("SERVER_B_ADDRESS") : "localhost:50052";

    Central central(
        grpc::CreateChannel(serverAAddr, grpc::InsecureChannelCredentials()),
        grpc::CreateChannel(serverBAddr, grpc::InsecureChannelCredentials())
    );

    HTTPServer server(&central);
    std::cout << "Starting Central Server..." << std::endl;
    std::cout << "gRPC clients connected to:" << std::endl;
    std::cout << "  - Server A: " << serverAAddr << std::endl;
    std::cout << "  - Server B: " << serverBAddr << std::endl;
    std::cout << "HTTP API available at: http://0.0.0.0:8080" << std::endl;

    server.start(8080);
    return 0;
}

