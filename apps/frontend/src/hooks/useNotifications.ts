import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

export interface AppNotification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

let socket: Socket | null = null;

export function useNotifications() {
  const token = useAuthStore((s) => s.token);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('notification', () => {
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token]);

  const clearUnread = () => setUnreadCount(0);

  return { unreadCount, clearUnread };
}
