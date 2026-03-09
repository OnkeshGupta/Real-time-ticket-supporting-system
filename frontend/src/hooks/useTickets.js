import { useState, useEffect, useCallback } from 'react';
import { ticketAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const useTickets = (initialFilters = {}) => {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const { on } = useSocket();

  const fetchTickets = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 12, ...currentFilters };
      if (!params.status || params.status === 'all') delete params.status;
      const data = await ticketAPI.getAll(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(filters); }, [filters, fetchTickets]);

  useEffect(() => {
    const removeCreated = on('ticket:created', (ticket) => {
      setTickets((prev) => {
        if (prev.some((t) => t._id === ticket._id)) return prev;
        return [ticket, ...prev];
      });
    });
    const removeUpdated = on('ticket:updated', (updated) => {
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t)));
    });
    return () => { removeCreated?.(); removeUpdated?.(); };
  }, [on]);

  const updateFilters = useCallback((newFilters) => { setFilters(newFilters); }, []);
  const changePage = useCallback((page) => { setFilters((prev) => ({ ...prev, page })); }, []);
  const refresh = useCallback(() => { fetchTickets(filters); }, [fetchTickets, filters]);

  return { tickets, pagination, loading, error, filters, updateFilters, changePage, refresh };
};

export default useTickets;