interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface JoinForumRequest {
  username: string;
  forumCode: string;
}

interface SendMessageRequest {
  username: string;
  forumCode: string;
  content: string;
}

interface GetMessagesRequest {
  forumCode: string;
  limit?: number;
  offset?: number;
}

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: string;
}

interface Forum {
  code: string;
  name: string;
  description?: string;
  messageCount: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Request failed',
        };
      }

      if (data.success !== undefined && data.data !== undefined) {
        return {
          success: data.success,
          data: data.data,
        };
      }
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async joinForum(request: JoinForumRequest): Promise<ApiResponse<{ token: string }>> {
    return this.makeRequest('/forum/join', 'POST', request);
  }

  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<Message>> {
    return this.makeRequest('/messages/send', 'POST', request);
  }

  async getMessages(request: GetMessagesRequest): Promise<ApiResponse<Message[]>> {
    const queryParams = new URLSearchParams({
      forumCode: request.forumCode,
      ...(request.limit && { limit: request.limit.toString() }),
      ...(request.offset && { offset: request.offset.toString() }),
    });

    return this.makeRequest(`/messages?${queryParams}`);
  }

  async getForumInfo(forumCode: string): Promise<ApiResponse<Forum>> {
    return this.makeRequest(`/forum/${forumCode}`);
  }

  async getAvailableForums(): Promise<ApiResponse<Forum[]>> {
    return this.makeRequest('/forums');
  }
}

export const apiService = new ApiService();
