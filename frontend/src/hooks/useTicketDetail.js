import { useState, useEffect, useCallback } from 'react';
import { ticketAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const useTicketDetail = (ticketId) => {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { on } = useSocket();

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ticketAPI.getById(ticketId);
      setTicket(data.ticket);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  useEffect(() => {
    const removeUpdated = on('ticket:updated', (updated) => {
      if (updated._id === ticketId) setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
    });
    return () => { removeUpdated?.(); };
  }, [on, ticketId]);

  return { ticket, comments, setComments, loading, error, refresh: fetchTicket };
};

export default useTicketDetail;