import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { ticketAPI, authAPI } from '../services/api';
import useTicketDetail from '../hooks/useTicketDetail';
import CommentThread from '../components/comments/CommentThread';
import { StatusBadge, PriorityBadge, Avatar, RoleBadge, Spinner, Modal } from '../components/common';
import { STATUS_CONFIG, ACTIVITY_ICONS, formatDateTime, timeAgo } from '../utils/helpers';

const ActivityItem = ({ activity }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
      {ACTIVITY_ICONS[activity.type] || '•'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-surface-700">{activity.description}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-surface-400">{activity.performedBy?.name}</span>
        <span className="text-xs text-surface-300">·</span>
        <span className="text-xs text-surface-400" title={formatDateTime(activity.createdAt)}>
          {timeAgo(activity.createdAt)}
        </span>
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-surface-400">{label}</span>
    <span className="text-sm text-surface-700">{children}</span>
  </div>
);

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAgent } = useAuth();
  const { toast } = useNotifications();
  const { ticket, comments, loading, error, refresh } = useTicketDetail(id);

  const [agents, setAgents] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');

  useEffect(() => {
    if (error) { toast.error(error); navigate('/tickets'); }
  }, [error, navigate, toast]);

  useEffect(() => {
    if (isAgent) {
      authAPI.getAgents().then(({ agents }) => setAgents(agents)).catch(() => {});
    }
  }, [isAgent]);

  const doUpdate = async (payload, successMsg) => {
    setUpdating(true);
    try {
      await ticketAPI.update(id, payload);
      toast.success(successMsg);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async () => {
    await doUpdate({ assignedTo: selectedAgent || null }, selectedAgent ? 'Ticket assigned' : 'Ticket unassigned');
    setShowAssignModal(false);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="xl" /></div>;
  if (!ticket) return null;

  const allStatuses = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
  const availableStatuses = isAgent
    ? allStatuses.filter((s) => s !== ticket.status)
    : ['waiting_for_customer', 'resolved'].filter((s) => s !== ticket.status);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/tickets')} className="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1 mb-3 transition-colors">
          ← All Tickets
        </button>
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-sm font-mono text-surface-400 font-medium pt-1">{ticket.ticketNumber}</span>
          <h1 className="text-xl font-bold text-surface-900 font-display flex-1">{ticket.title}</h1>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.category && (
            <span className="badge bg-surface-100 text-surface-600 capitalize">
              {ticket.category.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: conversation */}
        <div className="xl:col-span-2 card flex flex-col" style={{ height: '72vh' }}>
          <div className="p-4 border-b border-surface-100 flex-shrink-0">
            <h2 className="font-semibold text-surface-800">Conversation</h2>
          </div>
          <div className="px-6 py-4 bg-surface-50 border-b border-surface-100 flex-shrink-0">
            <div className="flex items-start gap-3">
              <Avatar name={ticket.createdBy?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-surface-800">{ticket.createdBy?.name}</span>
                  <RoleBadge role={ticket.createdBy?.role} />
                  <span className="text-xs text-surface-400">{timeAgo(ticket.createdAt)}</span>
                </div>
                <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                {ticket.tags?.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {ticket.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CommentThread ticketId={id} initialComments={comments} isAgent={isAgent} />
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Update Status</h3>
            {availableStatuses.length === 0 ? (
              <p className="text-xs text-surface-400 italic">No transitions available</p>
            ) : (
              <div className="space-y-2">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => doUpdate({ status }, `Status updated to ${status.replace(/_/g, ' ')}`)}
                    disabled={updating}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm border border-surface-200
                      hover:border-brand-300 hover:bg-brand-50 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[status]?.dot}`} />
                    {STATUS_CONFIG[status]?.label || status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          {isAgent && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Priority</h3>
              <select
                value={ticket.priority}
                onChange={(e) => doUpdate({ priority: e.target.value }, 'Priority updated')}
                disabled={updating}
                className="input text-sm"
              >
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee */}
          {isAgent && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Assignee</h3>
              {ticket.assignedTo ? (
                <div className="flex items-center gap-2 mb-3">
                  <Avatar name={ticket.assignedTo.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-surface-800">{ticket.assignedTo.name}</p>
                    <p className="text-xs text-surface-400">{ticket.assignedTo.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-surface-400 italic mb-3">Unassigned</p>
              )}
              <button
                onClick={() => { setSelectedAgent(ticket.assignedTo?._id || ''); setShowAssignModal(true); }}
                disabled={updating}
                className="btn-secondary btn-sm w-full"
              >
                {ticket.assignedTo ? 'Reassign' : 'Assign Agent'}
              </button>
            </div>
          )}

          {/* Details */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Details</h3>
            <InfoRow label="Created by">
              <div className="flex items-center gap-1.5">
                <Avatar name={ticket.createdBy?.name} size="xs" />
                <span>{ticket.createdBy?.name}</span>
              </div>
            </InfoRow>
            <InfoRow label="Created">{timeAgo(ticket.createdAt)}</InfoRow>
            <InfoRow label="Last updated">{timeAgo(ticket.updatedAt)}</InfoRow>
            {ticket.resolvedAt && <InfoRow label="Resolved">{timeAgo(ticket.resolvedAt)}</InfoRow>}
            {ticket.firstResponseAt && <InfoRow label="First response">{timeAgo(ticket.firstResponseAt)}</InfoRow>}
          </div>

          {/* Activity */}
          {ticket.activity?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Activity</h3>
              <div className="divide-y divide-surface-100 max-h-80 overflow-y-auto">
                {[...ticket.activity].reverse().slice(0, 15).map((activity) => (
                  <ActivityItem key={activity._id} activity={activity} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Ticket" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Select Agent</label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="input">
              <option value="">— Unassigned —</option>
              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>{agent.name} ({agent.role})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAssignModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAssign} disabled={updating} className="btn-primary flex-1">
              {updating ? <Spinner size="sm" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TicketDetails;