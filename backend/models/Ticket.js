const mongoose = require('mongoose');

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TICKET_CATEGORIES = ['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other'];

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['status_change', 'assignment', 'priority_change', 'comment', 'created'], required: true },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldValue: { type: String },
    newValue: { type: String },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    title: { type: String, required: [true, 'Ticket title is required'], trim: true, minlength: 5, maxlength: 200 },
    description: { type: String, required: [true, 'Description is required'], trim: true, minlength: 10, maxlength: 5000 },
    status: { type: String, enum: TICKET_STATUSES, default: 'open' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'general' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true }],
    attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    activity: [activitySchema],
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    firstResponseAt: { type: Date },
    dueDate: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ticketSchema.pre('save', async function (next) {
  try {
    if (!this.ticketNumber) {
      const count = await mongoose.model('Ticket').countDocuments();
      this.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
    }

    if (this.isModified('status')) {
      if (this.status === 'resolved') this.resolvedAt = new Date();
      if (this.status === 'closed') this.closedAt = new Date();
    }

    if (typeof next === 'function') next();
  } catch (error) {
    if (typeof next === 'function') next(error);
    else throw error;
  }
});

ticketSchema.virtual('commentCount', { ref: 'Comment', localField: '_id', foreignField: 'ticket', count: true });

ticketSchema.index({ status: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.TICKET_STATUSES = TICKET_STATUSES;
module.exports.TICKET_PRIORITIES = TICKET_PRIORITIES;