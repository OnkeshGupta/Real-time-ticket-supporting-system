import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const initialState = { user: null, token: null, loading: true, error: null };

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS': return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'LOGOUT': return { ...initialState, loading: false };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    case 'UPDATE_USER': return { ...state, user: action.payload };
    default: return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { dispatch({ type: 'SET_LOADING', payload: false }); return; }
    try {
      const { user } = await authAPI.getMe();
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    initAuth();
    const handleLogout = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [initAuth]);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { user, token } = await authAPI.login({ email, password });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    return user;
  };

  const register = async (data) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { user, token } = await authAPI.register(data);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const isAgent = state.user?.role === 'agent' || state.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, isAgent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};