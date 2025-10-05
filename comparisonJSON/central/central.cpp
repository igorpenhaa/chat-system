#include <iostream>
#include <memory>
#include <thread>
#include <map>
#include <vector>
#include <mutex>
#include <sstream>
#include <cstring>
#include <fstream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct WriteCallbackData {
    std::string response;
};

size_t WriteCallback(void *contents, size_t size, size_t nmemb, WriteCallbackData *data) {
    size_t totalSize = size * nmemb;
    data->response.append((char*)contents, totalSize);
    return totalSize;
}

class Central {
public:
    Central(const std::string& serverA_url, const std::string& serverB_url)
      : serverA_base_url(serverA_url), serverB_base_url(serverB_url) {
        curl_global_init(CURL_GLOBAL_DEFAULT);
    }

    ~Central() {
        curl_global_cleanup();
    }

    bool SendMessage(const json& msg) {
        json check_response_json = makeHttpRequestJson(serverB_base_url + "/check", msg);

        if (check_response_json.is_null()) {
            std::cerr << "Checker error: failed to contact service" << std::endl;
            return false;
        }

        if (!check_response_json["allowed"].get<bool>()) {
            std::cout << "Mensagem bloqueada: " << check_response_json["reason"].get<std::string>() << std::endl;
            return false;
        }

        {
            std::lock_guard<std::mutex> lock(messages_mutex);
            forum_messages[msg["forum_id"].get<std::string>()].push_back({
                msg["username"].get<std::string>(),
                msg["text"].get<std::string>(),
                std::time(nullptr)
            });
        }

        std::cout << "Mensagem armazenada com sucesso\n";
        return true;
    }

    void StartForumStream(const std::string& username, const std::string& forum_id) {
        std::thread([this, username, forum_id]() {
            json req = {
                {"username", username},
                {"forum_id", forum_id}
            };

            json response = makeHttpRequestJson(serverA_base_url + "/join", req);

            if (!response.is_null()) {
                std::cout << "Forum stream started for " << username << " in " << forum_id << std::endl;
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

    std::string serverA_base_url;
    std::string serverB_base_url;
    std::map<std::string, std::vector<ForumMessage>> forum_messages;
    std::mutex messages_mutex;

    json makeHttpRequestJson(const std::string& url, const json& payload) {
        CURL *curl;
        CURLcode res;
        WriteCallbackData response_data;

        curl = curl_easy_init();
        if(curl) {
            std::string payload_str = payload.dump();
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload_str.c_str());
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_data);

            struct curl_slist *headers = NULL;
            headers = curl_slist_append(headers, "Content-Type: application/json");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

            res = curl_easy_perform(curl);
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);

            if(res != CURLE_OK) {
                std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
                return json();
            }
        }

        try {
            return json::parse(response_data.response);
        } catch (const std::exception& e) {
            std::cerr << "JSON parse error: " << e.what() << std::endl;
            return json();
        }
    }
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

    std::string parse_json_field(const std::string& json_str, const std::string& field) {
        try {
            json j = json::parse(json_str);
            if (j.contains(field)) {
                return j[field].get<std::string>();
            }
        } catch (const std::exception& e) {
            std::cerr << "JSON parse error: " << e.what() << std::endl;
        }
        return "";
    }

    void handle_request(int client_socket) {
        char buffer[4096] = {0};
        read(client_socket, buffer, 4096);

        std::string request(buffer);
        std::istringstream request_stream(request);
        std::string method, path, version;
        request_stream >> method >> path >> version;

        std::cout << "Request: " << method << " " << path << std::endl;

        if (method == "OPTIONS") {
            std::string response = create_json_response("");
            send(client_socket, response.c_str(), response.length(), 0);
            close(client_socket);
            return;
        }

        if (method == "POST" && path == "/api/forum/join") {
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos) {
                std::string body = request.substr(body_start + 4);
                std::string username = parse_json_field(body, "username");
                std::string forum_code = parse_json_field(body, "forumCode");

                if (!username.empty() && !forum_code.empty()) {
                    central->StartForumStream(username, forum_code);
                    std::cout << "User " << username << " joined forum " << forum_code << std::endl;

                    std::string json_response = "{\"success\":true,\"data\":{\"token\":\"user_" + username + "_" + forum_code + "\"}}";
                    std::string response = create_json_response(json_response);
                    send(client_socket, response.c_str(), response.length(), 0);
                } else {
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
                    json msg = {
                        {"username", username},
                        {"forum_id", forum_code},
                        {"text", content}
                    };

                    bool success = central->SendMessage(msg);

                    if (success) {
                        std::string json_response = "{\"success\":true,\"data\":{\"id\":\"" + std::to_string(std::time(nullptr)) + "\",\"username\":\"" + username + "\",\"content\":\"" + content + "\",\"timestamp\":\"" + std::to_string(std::time(nullptr)) + "\"}}";
                        std::string response = create_json_response(json_response);
                        send(client_socket, response.c_str(), response.length(), 0);
                    } else {
                        std::string json_response = "{\"success\":false,\"message\":\"Message blocked or failed\"}";
                        std::string response = create_json_response(json_response, 400);
                        send(client_socket, response.c_str(), response.length(), 0);
                    }
                } else {
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
                std::string json_response = "{\"success\":false,\"message\":\"Missing forumCode parameter\"}";
                std::string response = create_json_response(json_response, 400);
                send(client_socket, response.c_str(), response.length(), 0);
            }
        }
        else {
            std::string json_response = "{\"success\":false,\"message\":\"Not found\"}";
            std::string response = create_json_response(json_response, 404);
            send(client_socket, response.c_str(), response.length(), 0);
        }

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

bool isRunningInDocker() {
    std::ifstream cgroup("/.dockerenv");
    if (cgroup.good()) {
        return true;
    }

    char hostname[256];
    if (gethostname(hostname, sizeof(hostname)) == 0) {
        std::string host(hostname);
        if (host.length() == 12 && host.find_first_not_of("0123456789abcdef") == std::string::npos) {
            return true;
        }
    }

    return false;
}

int main() {
    std::string serverA_url, serverB_url;

    if (isRunningInDocker()) {
        serverA_url = "http://servera:3001";
        serverB_url = "http://serverb:3002";
        std::cout << "Using Docker service names" << std::endl;
    } else {
        serverA_url = "http://localhost:3001";
        serverB_url = "http://localhost:3002";
        std::cout << "Using localhost addresses" << std::endl;
    }

    Central central(serverA_url, serverB_url);
    HTTPServer server(&central);

    std::cout << "Starting Central Server..." << std::endl;
    std::cout << "Server A: " << serverA_url << std::endl;
    std::cout << "Server B: " << serverB_url << std::endl;
    std::cout << "HTTP API: http://localhost:8080" << std::endl;

    server.start(8080);

    return 0;
}