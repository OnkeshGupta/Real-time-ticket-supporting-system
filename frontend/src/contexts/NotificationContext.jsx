import { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': return [action.payload, ...state].slice(0, 50);
    case 'REMOVE': return state.filter((n) => n.id !== action.payload);
    case 'CLEAR_ALL': return [];
    default: return state;
  }
};

let notifCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, dispatch] = useReducer(notificationReducer, []);
  const { on } = useSocket();
  const { isAgent, user } = useAuth();

  const addNotification = useCallback((notif) => {
    const id = `notif_${Date.now()}_${++notifCounter}`;
    const notification = { id, timestamp: new Date(), ...notif };
    dispatch({ type: 'ADD', payload: notification });
    if (notif.autoClose !== false) {
      setTimeout(() => dispatch({ type: 'REMOVE', payload: id }), notif.duration || 5000);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => { dispatch({ type: 'REMOVE', payload: id }); }, []);

  const toast = useMemo(() => ({
    success: (msg, opts) => addNotification({ type: 'success', message: msg, ...opts }),
    error: (msg, opts) => addNotification({ type: 'error', message: msg, duration: 7000, ...opts }),
    info: (msg, opts) => addNotification({ type: 'info', message: msg, ...opts }),
    warning: (msg, opts) => addNotification({ type: 'warning', message: msg, ...opts }),
  }), [addNotification]);

  useEffect(() => {
    const removeNewTicket = on('ticket:new_notification', (data) => {
      if (isAgent) addNotification({ type: 'info', title: 'New Ticket', message: data.message, link: `/tickets/${data.ticket._id}`, duration: 8000 });
    });
    const removeStatusChange = on('ticket:status_changed', (data) => {
      addNotification({ type: 'info', title: 'Ticket Updated', message: `#${data.ticketNumber} status → ${data.newStatus.replace(/_/g, ' ')}`, link: `/tickets/${data.ticketId}`, duration: 5000 });
    });
    const removeNewComment = on('comment:new', (data) => {
      if (data.comment?.author?._id !== user?._id) {
        addNotification({ type: 'info', title: 'New Comment', message: `${data.comment?.author?.name} commented on a ticket`, link: `/tickets/${data.ticketId}`, duration: 5000 });
      }
    });
    return () => { removeNewTicket?.(); removeStatusChange?.(); removeNewComment?.(); };
  }, [on, isAgent, user, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, toast }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};