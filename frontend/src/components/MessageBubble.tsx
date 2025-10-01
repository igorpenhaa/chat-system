import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const isSystemMessage = message.username === 'Sistema';

  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
              : 'bg-white text-gray-800 shadow-md'
          }`}
        >
          {!isOwn && (
            <div className="text-xs font-semibold text-blue-600 mb-1">
              {message.username}
            </div>
          )}

          <div className="text-sm leading-relaxed">
            {message.content}
          </div>

          <div className={`text-xs mt-2 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            <div className="flex items-center justify-between">
              <span>{formatTime(message.timestamp)}</span>
              {isOwn && (
                <div className="ml-2">
                  {message.approved === false ? (
                    <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {message.approved === false && isOwn && (
            <div className="absolute -bottom-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full">
              Verificando...
            </div>
          )}
        </div>

        {!isOwn && (
          <div className="flex items-center mt-1 ml-2">
            <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">
                {message.username.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;