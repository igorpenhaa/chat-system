import React, { useEffect, useRef } from 'react';
import { User } from '../types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useMessages } from '../hooks/useMessages';

interface ChatRoomProps {
  user: User;
  onLogout: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ user, onLogout }) => {
  const { messages, isLoading, error, sendMessage, onlineUsers, isConnected } = useMessages(user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const getOnlineCount = () => {
    return onlineUsers.length + 1; // +1 para incluir o usuário atual
  };

  const getConnectionStatus = () => {
    return isConnected ? 'Conectado' : 'Desconectado';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Fórum #{user.forumCode}</h1>
              <p className="text-sm text-gray-500">
                <span className="inline-flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {getOnlineCount()} usuários online - {getConnectionStatus()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">Conectado</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex">
              <svg className="flex-shrink-0 h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Carregando mensagens...</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.username === user.name}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatRoom;