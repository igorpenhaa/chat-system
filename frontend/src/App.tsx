import { useState, useEffect, useCallback } from 'react';
import { apiService } from './services/api';

interface User {
  name: string;
  forumCode: string;
}

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: string;
}
function SimpleLoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [name, setName] = useState('');
  const [forumCode, setForumCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && forumCode.trim()) {
      setLoading(true);
      setError('');

      try {
        const response = await apiService.joinForum({
          username: name.trim(),
          forumCode: forumCode.trim()
        });

        if (response.success) {
          onLogin({ name: name.trim(), forumCode: forumCode.trim() });
        } else {
          setError(response.message || 'Erro ao entrar no fórum');
        }
      } catch (err) {
        setError('Erro de conexão com o servidor');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Chat Fórum</h2>
              <p className="text-gray-600">Entre no fórum e comece a conversar</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Digite seu nome"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Fórum
                </label>
                <input
                  type="text"
                  value={forumCode}
                  onChange={(e) => setForumCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Digite o código do fórum"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                {loading ? 'Conectando...' : 'Entrar no Fórum'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleChatRoom({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');

  const fetchMessages = useCallback(async () => {
    try {
      const response = await apiService.getMessages({
        forumCode: user.forumCode
      });

      if (response.success && response.data && Array.isArray(response.data)) {
        setMessages(response.data);
        setConnectionStatus('Conectado');
        setError('');
      } else {
        setMessages([]);
        if (!error) {
          setError('Erro ao carregar mensagens');
          setConnectionStatus('Erro de conexão');
        }
      }
    } catch (err) {
      setMessages([]);
      if (!error) {
        setError('Erro de conexão');
        setConnectionStatus('Desconectado');
      }
    }
  }, [user.forumCode, error]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sending) {
      setSending(true);
      setError('');

      try {
        const response = await apiService.sendMessage({
          username: user.name,
          forumCode: user.forumCode,
          content: message.trim()
        });

        if (response.success) {
          setMessage('');
          await fetchMessages();
        } else {
          setError(response.message || 'Erro ao enviar mensagem');
        }
      } catch (err) {
        setError('Erro de conexão ao enviar mensagem');
      } finally {
        setSending(false);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleTimeString();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Fórum #{user.forumCode}</h1>
            <p className="text-sm text-gray-500">
              Conectado como {user.name} - {connectionStatus}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            Sair
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right text-red-500 hover:text-red-700"
          >
            X
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Nenhuma mensagem ainda. Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`rounded-lg p-4 shadow-sm ${
              msg.username === user.name ? 'bg-blue-50 ml-12' : 'bg-white'
            }`}>
              <div className={`font-semibold ${
                msg.username === user.name ? 'text-blue-700' : 'text-blue-600'
              }`}>
                {msg.username} {msg.username === user.name ? '(Você)' : ''}
              </div>
              <div className="text-gray-800 mt-1">{msg.content}</div>
              <div className="text-xs text-gray-500 mt-2">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="App">
      {currentUser ? (
        <SimpleChatRoom user={currentUser} onLogout={handleLogout} />
      ) : (
        <SimpleLoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
