import { STATUS_CONFIG, PRIORITY_CONFIG, getInitials } from '../../utils/helpers';

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, color: 'priority-low', dot: 'bg-surface-400' };
  return (
    <span className={`badge ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`} />
      {config.label}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority] || { label: priority, color: 'priority-low', icon: '' };
  return (
    <span className={`badge ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
};

export const Avatar = ({ name, size = 'md', className = '' }) => {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base', xl: 'w-12 h-12 text-lg' };
  const colors = ['bg-brand-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500'];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${sizes[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  );
};

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return (
    <svg className={`animate-spin ${sizes[size]} text-brand-600 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
};

export const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size="xl" />
  </div>
);

export const EmptyState = ({ icon = '🎫', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-surface-800 mb-1">{title}</h3>
    {description && <p className="text-sm text-surface-500 mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
);

export const RoleBadge = ({ role }) => {
  const configs = { customer: 'bg-surface-100 text-surface-600', agent: 'bg-brand-50 text-brand-700', admin: 'bg-purple-50 text-purple-700' };
  return <span className={`badge ${configs[role] || configs.customer}`}>{role?.charAt(0).toUpperCase() + role?.slice(1)}</span>;
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} animate-bounce-in`}>
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900 font-display">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};