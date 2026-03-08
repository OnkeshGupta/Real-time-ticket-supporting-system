import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ticketAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import TicketCard from '../components/tickets/TicketCard';
import TicketFilters from '../components/tickets/TicketFilters';
import { Spinner, EmptyState } from '../components/common';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const { isAgent } = useAuth();
  const { on } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize filters from URL params
  useEffect(() => {
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    if (status || assignedTo) {
      setFilters(prev => ({ ...prev, ...(status && { status }), ...(assignedTo && { assignedTo }) }));
    }
  }, []);

  const fetchTickets = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    try {
      const params = { limit: 12, ...currentFilters };
      if (!params.status || params.status === 'all') delete params.status;
      const data = await ticketAPI.getAll(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets(filters);
  }, [filters]);

  // Real-time: refresh list on ticket events
  useEffect(() => {
    const removeCreated = on('ticket:created', (ticket) => {
      setTickets(prev => [ticket, ...prev]);
    });

    const removeUpdated = on('ticket:updated', (updated) => {
      setTickets(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
    });

    return () => {
      removeCreated?.();
      removeUpdated?.();
    };
  }, [on]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">
            {isAgent ? 'All Tickets' : 'My Tickets'}
          </h1>
          {pagination && (
            <p className="text-surface-500 text-sm mt-1">
              {pagination.total} ticket{pagination.total !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
        {!isAgent && (
          <button onClick={() => navigate('/tickets/new')} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <TicketFilters filters={filters} onChange={handleFilterChange} isAgent={isAgent} />
      </div>

      {/* Ticket grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No tickets found"
          description="Try adjusting your filters or create a new ticket."
          action={!isAgent && (
            <button onClick={() => navigate('/tickets/new')} className="btn-primary btn-sm">
              Create Ticket
            </button>
          )}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {tickets.map((ticket) => (
            <TicketCard key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            ← Prev
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === page
                      ? 'bg-brand-600 text-white'
                      : 'btn-secondary'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketList;