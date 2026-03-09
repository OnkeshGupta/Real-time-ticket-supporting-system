import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { CATEGORIES } from '../utils/helpers';
import { Spinner } from '../components/common';

const CreateTicket = () => {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: 'general', tags: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { toast } = useNotifications();

  const validate = () => {
    const errs = {};
    if (!form.title.trim() || form.title.length < 5) errs.title = 'Title must be at least 5 characters';
    if (!form.description.trim() || form.description.length < 10) errs.description = 'Description must be at least 10 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await ticketAPI.create({
        ...form,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      toast.success(`Ticket ${data.ticket.ticketNumber} created!`);
      navigate(`/tickets/${data.ticket._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: '' }); },
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Create Support Ticket</h1>
        <p className="text-surface-500 mt-1">Describe your issue and we'll get back to you shortly.</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...field('title')}
              placeholder="Brief description of your issue"
              className={`input ${errors.title ? 'border-red-300 focus:ring-red-400' : ''}`}
              maxLength={200}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            <p className="text-xs text-surface-400 mt-1">{form.title.length}/200</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select {...field('category')} className="input">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select {...field('priority')} className="input">
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea
              {...field('description')}
              rows={6}
              placeholder="Please provide as much detail as possible. Include steps to reproduce if it's a bug."
              className={`input resize-none ${errors.description ? 'border-red-300 focus:ring-red-400' : ''}`}
              maxLength={5000}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            <p className="text-xs text-surface-400 mt-1">{form.description.length}/5000</p>
          </div>

          <div>
            <label className="label">Tags <span className="text-surface-400 font-normal">(optional, comma-separated)</span></label>
            <input
              type="text"
              {...field('tags')}
              placeholder="e.g. login, payment, urgent"
              className="input"
            />
          </div>

          {form.priority === 'urgent' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">
                ⚡ <strong>Urgent</strong> tickets are prioritized for immediate response. Please ensure this is truly urgent.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Spinner size="sm" /> : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;