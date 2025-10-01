import { useState, useEffect, useCallback } from 'react';
import { Message, User } from '../types';
import { apiService } from '../services/api';
import { useRealTimeConnection } from './useRealTimeConnection';

export const useMessages = (user: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Em produção, aqui seria feita a chamada real para a API
      // const response = await apiService.getMessages({
      //   forumCode: user.forumCode,
      //   limit: 50
      // });
      //
      // if (response.success && response.data) {
      //   setMessages(response.data);
      // } else {
      //   setError(response.message || 'Erro ao carregar mensagens');
      // }

      // Simulação para desenvolvimento
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockMessages: Message[] = [
        {
          id: '1',
          username: 'Sistema',
          content: `Bem-vindo ao fórum ${user.forumCode}!`,
          timestamp: new Date(Date.now() - 5 * 60000),
          approved: true
        },
        {
          id: '2',
          username: 'Ana',
          content: 'Olá pessoal! Como vocês estão?',
          timestamp: new Date(Date.now() - 3 * 60000),
          approved: true
        },
        {
          id: '3',
          username: 'João',
          content: 'Tudo bem! Este sistema está funcionando muito bem.',
          timestamp: new Date(Date.now() - 2 * 60000),
          approved: true
        }
      ];

      setMessages(mockMessages);
    } catch (err) {
      setError('Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  }, [user.forumCode]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    try {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        username: user.name,
        content,
        timestamp: new Date(),
        approved: false
      };

      setMessages(prev => [...prev, tempMessage]);

      // Em produção, aqui seria feita a chamada real para a API
      // const response = await apiService.sendMessage({
      //   username: user.name,
      //   forumCode: user.forumCode,
      //   content
      // });
      //
      // if (response.success && response.data) {
      //   setMessages(prev =>
      //     prev.map(msg =>
      //       msg.id === tempMessage.id
      //         ? { ...response.data!, id: response.data!.id }
      //         : msg
      //     )
      //   );
      //   return true;
      // } else {
      //   setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      //   setError(response.message || 'Erro ao enviar mensagem');
      //   return false;
      // }

      // Simulação para desenvolvimento - simular aprovação depois de 2 segundos
      setTimeout(() => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id
              ? { ...msg, approved: true, id: `approved-${Date.now()}` }
              : msg
          )
        );
      }, 2000);

      return true;
    } catch (err) {
      setError('Erro ao enviar mensagem');
      return false;
    }
  }, [user.name, user.forumCode]);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Verificar se a mensagem já existe para evitar duplicatas
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });

    // Mostrar notificação para mensagens de outros usuários
    if (message.username !== user.name && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Nova mensagem de ${message.username}`, {
          body: message.content,
          icon: '/favicon.ico'
        });
      }
    }
  }, [user.name]);

  const handleUserJoined = useCallback((username: string) => {
    setOnlineUsers(prev => {
      if (prev.includes(username)) return prev;
      return [...prev, username];
    });

    // Adicionar mensagem de sistema quando usuário entra
    const systemMessage: Message = {
      id: `system-join-${Date.now()}`,
      username: 'Sistema',
      content: `${username} entrou no fórum`,
      timestamp: new Date(),
      approved: true
    };
    handleNewMessage(systemMessage);
  }, [handleNewMessage]);

  const handleUserLeft = useCallback((username: string) => {
    setOnlineUsers(prev => prev.filter(user => user !== username));

    // Adicionar mensagem de sistema quando usuário sai
    const systemMessage: Message = {
      id: `system-left-${Date.now()}`,
      username: 'Sistema',
      content: `${username} saiu do fórum`,
      timestamp: new Date(),
      approved: true
    };
    handleNewMessage(systemMessage);
  }, [handleNewMessage]);

  // Configurar conexão em tempo real
  const { isConnected } = useRealTimeConnection({
    user,
    onNewMessage: handleNewMessage,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });

  // Solicitar permissão para notificações
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    reloadMessages: loadMessages,
    onlineUsers,
    isConnected,
  };
};