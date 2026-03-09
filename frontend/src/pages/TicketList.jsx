import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useTickets from '../hooks/useTickets';
import TicketListComponent from '../components/tickets/TicketList';
import TicketFilters from '../components/tickets/TicketFilters';

const TicketList = () => {
  const { isAgent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialFilters = {};
  const urlStatus = searchParams.get('status');
  const urlAssignedTo = searchParams.get('assignedTo');
  if (urlStatus) initialFilters.status = urlStatus;
  if (urlAssignedTo) initialFilters.assignedTo = urlAssignedTo;

  const { tickets, pagination, loading, filters, updateFilters, changePage } = useTickets(initialFilters);

  useEffect(() => {
    if (urlStatus || urlAssignedTo) updateFilters({ ...initialFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 space-y-6">
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

      <div className="card p-4">
        <TicketFilters filters={filters} onChange={updateFilters} isAgent={isAgent} />
      </div>

      <TicketListComponent tickets={tickets} loading={loading} isAgent={isAgent} />

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => changePage(pagination.page - 1)}
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
                  onClick={() => changePage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                    ${pagination.page === page ? 'bg-brand-600 text-white' : 'btn-secondary'}`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => changePage(pagination.page + 1)}
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