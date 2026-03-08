import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, Avatar } from '../common';
import { timeAgo, truncate } from '../../utils/helpers';

const TicketCard = ({ ticket, compact = false }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/tickets/${ticket._id}`)}
      className="card p-5 hover:shadow-md hover:border-brand-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-surface-400 font-medium">{ticket.ticketNumber}</span>
            {ticket.category && (
              <span className="text-xs bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded capitalize">
                {ticket.category.replace('_', ' ')}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-surface-800 group-hover:text-brand-700 transition-colors truncate">
            {ticket.title}
          </h3>
          {!compact && (
            <p className="text-sm text-surface-500 mt-1 line-clamp-2">
              {truncate(ticket.description, 120)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
        <div className="flex items-center gap-3">
          {ticket.createdBy && (
            <div className="flex items-center gap-1.5">
              <Avatar name={ticket.createdBy.name} size="xs" />
              <span className="text-xs text-surface-500">{ticket.createdBy.name}</span>
            </div>
          )}
          {ticket.assignedTo && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-surface-400">→</span>
              <Avatar name={ticket.assignedTo.name} size="xs" />
              <span className="text-xs text-surface-500">{ticket.assignedTo.name}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-surface-400">{timeAgo(ticket.createdAt)}</span>
      </div>
    </div>
  );
};

export default TicketCard;