import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setConnected(false); }
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => { setConnected(true); });
    socket.on('disconnect', () => { setConnected(false); });
    socket.on('connect_error', () => { setConnected(false); });

    socketRef.current = socket;

    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [token, user]);

  const on = useCallback((event, handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => { socketRef.current?.off(event, handler); }, []);
  const emit = useCallback((event, data) => { socketRef.current?.emit(event, data); }, []);
  const joinTicketRoom = useCallback((ticketId) => { socketRef.current?.emit('ticket:join', ticketId); }, []);
  const leaveTicketRoom = useCallback((ticketId) => { socketRef.current?.emit('ticket:leave', ticketId); }, []);

  return (
    <SocketContext.Provider value={{ connected, on, off, emit, joinTicketRoom, leaveTicketRoom, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};