import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { ticketAPI } from '../services/api';
import { StatusBadge, PriorityBadge, Spinner, EmptyState } from '../components/common';
import { timeAgo } from '../utils/helpers';

const StatCard = ({ label, value, icon, color, onClick }) => (
  <div
    onClick={onClick}
    className={`card p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:border-brand-200' : ''}`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <span className={`text-3xl font-bold font-display ${color}`}>{value}</span>
    </div>
    <p className="text-sm font-medium text-surface-600">{label}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAgent } = useAuth();
  const { on } = useSocket();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const data = await ticketAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const removeCreated = on('ticket:created', fetchStats);
    const removeUpdated = on('ticket:updated', fetchStats);
    return () => { removeCreated?.(); removeUpdated?.(); };
  }, [on]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Spinner size="xl" />
    </div>
  );

  const statusCounts = stats?.byStatus || {};
  const total = stats?.total || 0;

  const statCards = [
    { label: 'Total Tickets', value: total, icon: '🎫', color: 'text-surface-800', status: null },
    { label: 'Open', value: statusCounts.open || 0, icon: '🔵', color: 'text-blue-600', status: 'open' },
    { label: 'In Progress', value: statusCounts.in_progress || 0, icon: '🟡', color: 'text-amber-600', status: 'in_progress' },
    { label: 'Resolved', value: statusCounts.resolved || 0, icon: '🟢', color: 'text-green-600', status: 'resolved' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Dashboard</h1>
          <p className="text-surface-500 mt-1">
            Welcome back, <span className="font-medium text-surface-700">{user?.name}</span>
          </p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            {...card}
            onClick={card.status ? () => navigate(`/tickets?status=${card.status}`) : undefined}
          />
        ))}
      </div>

      {isAgent && stats?.byPriority && Object.keys(stats.byPriority).length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wide mb-4">Open Tickets by Priority</h2>
          <div className="grid grid-cols-4 gap-4">
            {['urgent', 'high', 'medium', 'low'].map((priority) => (
              <div key={priority} className="text-center">
                <div className="text-2xl font-bold text-surface-800">{stats.byPriority[priority] || 0}</div>
                <div className="text-xs text-surface-500 capitalize mt-1">{priority}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-6 border-b border-surface-100 flex items-center justify-between">
          <h2 className="font-semibold text-surface-800">Recent Activity</h2>
          <button onClick={() => navigate('/tickets')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View all →
          </button>
        </div>
        <div className="divide-y divide-surface-100">
          {!stats?.recentTickets?.length ? (
            <EmptyState
              icon="🎫"
              title="No tickets yet"
              description={isAgent ? 'No tickets have been created yet.' : 'Submit your first support ticket.'}
              action={!isAgent && (
                <button onClick={() => navigate('/tickets/new')} className="btn-primary btn-sm">
                  Create Ticket
                </button>
              )}
            />
          ) : (
            stats.recentTickets.map((ticket) => (
              <div
                key={ticket._id}
                onClick={() => navigate(`/tickets/${ticket._id}`)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-surface-400">{ticket.ticketNumber}</span>
                    <span className="font-medium text-surface-800 truncate">{ticket.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-surface-400">by {ticket.createdBy?.name}</span>
                    <span className="text-xs text-surface-300">·</span>
                    <span className="text-xs text-surface-400">{timeAgo(ticket.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;