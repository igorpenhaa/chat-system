import { useEffect, useRef, useCallback } from 'react';
import { Message, User } from '../types';

interface UseRealTimeConnectionProps {
  user: User;
  onNewMessage: (message: Message) => void;
  onUserJoined: (username: string) => void;
  onUserLeft: (username: string) => void;
}

export const useRealTimeConnection = ({
  user,
  onNewMessage,
  onUserJoined,
  onUserLeft,
}: UseRealTimeConnectionProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const startConnection = useCallback(() => {
    // Em produção, aqui seria configurado um WebSocket
    // const ws = new WebSocket(`ws://localhost:8080/ws/forum/${user.forumCode}`);
    //
    // ws.onopen = () => {
    //   console.log('WebSocket connected');
    //   ws.send(JSON.stringify({
    //     type: 'join',
    //     username: user.name,
    //     forumCode: user.forumCode
    //   }));
    // };
    //
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //
    //   switch (data.type) {
    //     case 'new_message':
    //       onNewMessage(data.message);
    //       break;
    //     case 'user_joined':
    //       onUserJoined(data.username);
    //       break;
    //     case 'user_left':
    //       onUserLeft(data.username);
    //       break;
    //   }
    // };
    //
    // ws.onclose = () => {
    //   console.log('WebSocket disconnected');
    //   // Tentar reconectar após 3 segundos
    //   setTimeout(startConnection, 3000);
    // };
    //
    // return () => {
    //   ws.close();
    // };

    // Simulação com polling para desenvolvimento
    intervalRef.current = setInterval(() => {
      // Simular chegada de mensagens aleatórias
      if (Math.random() < 0.1) { // 10% de chance a cada 3 segundos
        const mockUsers = ['Alice', 'Bob', 'Carol', 'David', 'Eve'];
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const mockMessages = [
          'Oi pessoal!',
          'Como vocês estão?',
          'Alguém viu as últimas notícias?',
          'Este sistema está funcionando bem!',
          'Legal esse chat em tempo real!',
          'Que bom te ver aqui!',
        ];

        if (randomUser !== user.name) {
          const randomMessage = mockMessages[Math.floor(Math.random() * mockMessages.length)];
          const newMessage: Message = {
            id: `sim-${Date.now()}-${Math.random()}`,
            username: randomUser,
            content: randomMessage,
            timestamp: new Date(),
            approved: true
          };

          if (lastMessageIdRef.current !== newMessage.id) {
            lastMessageIdRef.current = newMessage.id;
            onNewMessage(newMessage);
          }
        }
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, onNewMessage, onUserJoined, onUserLeft]);

  const stopConnection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const cleanup = startConnection();
    return cleanup;
  }, [startConnection]);

  return {
    stopConnection,
    isConnected: intervalRef.current !== null,
  };
};