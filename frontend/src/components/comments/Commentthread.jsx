import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, Spinner } from '../common';
import { timeAgo, formatDateTime } from '../../utils/helpers';
import { ticketAPI } from '../../services/api';

const CommentBubble = ({ comment, currentUserId }) => {
  const isOwn = comment.author?._id === currentUserId;
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-fade`}>
      <Avatar name={comment.author?.name} size="sm" className="flex-shrink-0 mt-1" />
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-surface-700">{comment.author?.name}</span>
          {comment.author?.role === 'agent' && (
            <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">Agent</span>
          )}
          {comment.isInternal && (
            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Internal</span>
          )}
          <span className="text-xs text-surface-400" title={formatDateTime(comment.createdAt)}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isOwn ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-surface-100 text-surface-800 rounded-tl-sm'}
            ${comment.isInternal ? 'border-2 border-amber-200' : ''}`}
        >
          {comment.content}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator = ({ users }) => {
  if (!users.length) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-surface-400 animate-fade">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span>{users.map((u) => u.name).join(', ')} {users.length === 1 ? 'is' : 'are'} typing...</span>
    </div>
  );
};

const CommentThread = ({ ticketId, initialComments = [], isAgent }) => {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { on, emit, joinTicketRoom, leaveTicketRoom } = useSocket();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => { setComments(initialComments); }, [initialComments]);

  useEffect(() => {
    joinTicketRoom(ticketId);

    const removeComment = on('comment:new', (data) => {
      if (data.ticketId === ticketId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.comment.author._id));
      }
    });

    const removeTyping = on('comment:user_typing', (data) => {
      if (data.ticketId === ticketId && data.userId !== user?._id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, name: data.userName }];
        });
      }
    });

    const removeStopTyping = on('comment:user_stop_typing', (data) => {
      if (data.ticketId === ticketId) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    return () => {
      leaveTicketRoom(ticketId);
      removeComment?.();
      removeTyping?.();
      removeStopTyping?.();
    };
  }, [ticketId, on, joinTicketRoom, leaveTicketRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, typingUsers]);

  const handleTyping = useCallback(() => {
    emit('comment:typing', { ticketId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('comment:stop_typing', { ticketId });
    }, 2000);
  }, [emit, ticketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    emit('comment:stop_typing', { ticketId });
    try {
      await ticketAPI.addComment(ticketId, { content: content.trim(), isInternal });
      setContent('');
      setIsInternal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments
            .filter((c) => isAgent || !c.isInternal)
            .map((comment) => (
              <CommentBubble key={comment._id} comment={comment} currentUserId={user?._id} />
            ))
        )}
        <TypingIndicator users={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-surface-100 p-4 bg-white flex-shrink-0">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-2">
          {isAgent && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-500 rounded"
              />
              <span className="text-xs text-surface-500">Internal note (hidden from customer)</span>
            </label>
          )}
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); handleTyping(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className={`input flex-1 resize-none text-sm ${isInternal ? 'border-amber-300 focus:ring-amber-400' : ''}`}
            />
            <button type="submit" disabled={submitting || !content.trim()} className="btn-primary px-4 self-end">
              {submitting ? <Spinner size="sm" /> : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentThread;