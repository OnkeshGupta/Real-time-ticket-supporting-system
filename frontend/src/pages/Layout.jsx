import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Avatar } from './index';

const navItems = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/tickets', icon: '◎', label: 'Tickets' },
  { to: '/tickets/new', icon: '⊕', label: 'New Ticket' },
];

const agentNavItems = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/tickets', icon: '◎', label: 'All Tickets' },
  { to: '/tickets?assignedTo=me', icon: '◉', label: 'My Tickets' },
];

const Layout = ({ children }) => {
  const { user, logout, isAgent } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = isAgent ? agentNavItems : navItems;

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold font-display">S</span>
            </div>
            <div>
              <p className="text-white font-semibold font-display text-sm">SupportDesk</p>
              <p className="text-surface-400 text-xs">Ticket System</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'}`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Connection status */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className={`w-2 h-2 rounded-full animate-pulse-dot ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-surface-500">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-surface-800">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-surface-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-surface-400 hover:text-white hover:bg-surface-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-surface-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <span className="font-medium text-surface-800">{user?.name}</span>
            <span>·</span>
            <span className="capitalize">{user?.role}</span>
          </div>
          <div className="flex items-center gap-2">
            {isAgent && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full font-medium border border-brand-100">
                Agent Mode
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;