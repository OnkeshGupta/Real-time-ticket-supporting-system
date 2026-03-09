import TicketCard from './TicketCard';
import { Spinner, EmptyState } from '../common';
import { useNavigate } from 'react-router-dom';

const TicketList = ({ tickets, loading, isAgent }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState
        icon="🎫"
        title="No tickets found"
        description="Try adjusting your filters or create a new ticket."
        action={
          !isAgent ? (
            <button onClick={() => navigate('/tickets/new')} className="btn-primary btn-sm">
              Create Ticket
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {tickets.map((ticket) => (
        <TicketCard key={ticket._id} ticket={ticket} />
      ))}
    </div>
  );
};

export default TicketList;