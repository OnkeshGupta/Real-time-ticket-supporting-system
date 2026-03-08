import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../utils/helpers';

const TicketFilters = ({ filters, onChange, isAgent }) => {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search tickets..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Status filter */}
      <select
        value={filters.status || 'all'}
        onChange={(e) => handleChange('status', e.target.value)}
        className="input w-auto pr-8"
      >
        <option value="all">All Statuses</option>
        {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Priority filter */}
      <select
        value={filters.priority || ''}
        onChange={(e) => handleChange('priority', e.target.value)}
        className="input w-auto pr-8"
      >
        <option value="">All Priorities</option>
        {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Assigned to me (agents only) */}
      {isAgent && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.assignedTo === 'me'}
            onChange={(e) => handleChange('assignedTo', e.target.checked ? 'me' : '')}
            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
          />
          <span className="text-sm text-surface-600 whitespace-nowrap">Assigned to me</span>
        </label>
      )}

      {/* Clear filters */}
      {(filters.search || (filters.status && filters.status !== 'all') || filters.priority || filters.assignedTo) && (
        <button
          onClick={() => onChange({ page: 1 })}
          className="btn-ghost text-xs px-2 py-1.5 text-brand-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default TicketFilters;