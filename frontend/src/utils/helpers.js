import { formatDistanceToNow, format } from 'date-fns';

export const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
export const formatDateTime = (date) => format(new Date(date), 'MMM d, yyyy h:mm a');
export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const STATUS_CONFIG = {
  open: { label: 'Open', color: 'status-open', dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'status-in_progress', dot: 'bg-amber-500' },
  waiting_for_customer: { label: 'Waiting', color: 'status-waiting_for_customer', dot: 'bg-purple-500' },
  resolved: { label: 'Resolved', color: 'status-resolved', dot: 'bg-green-500' },
  closed: { label: 'Closed', color: 'status-closed', dot: 'bg-surface-400' },
};

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'priority-low', icon: '↓' },
  medium: { label: 'Medium', color: 'priority-medium', icon: '→' },
  high: { label: 'High', color: 'priority-high', icon: '↑' },
  urgent: { label: 'Urgent', color: 'priority-urgent', icon: '⚡' },
};

export const CATEGORIES = ['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other'];
export const STATUSES = Object.keys(STATUS_CONFIG);

export const ACTIVITY_ICONS = {
  created: '🎫',
  status_change: '🔄',
  assignment: '👤',
  priority_change: '⚡',
  comment: '💬',
};

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const truncate = (str, n = 100) =>
  str?.length > n ? str.slice(0, n) + '...' : str;