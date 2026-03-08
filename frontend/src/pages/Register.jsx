import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/common';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-brand-950 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold font-display">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white font-display">Create Account</h1>
          <p className="text-surface-400 mt-1">Join SupportDesk today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="John Smith"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'customer', label: '🙋 Customer', desc: 'Submit and track tickets' },
                  { value: 'agent', label: '🎧 Agent', desc: 'Handle support tickets' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer border-2 rounded-xl p-3 transition-all
                      ${form.role === option.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 hover:border-surface-300'}`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      checked={form.role === option.value}
                      onChange={() => setForm({ ...form, role: option.value })}
                      className="sr-only"
                    />
                    <div className="text-sm font-semibold text-surface-800">{option.label}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{option.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;