const mongoose = require('mongoose');

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TICKET_CATEGORIES = ['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other'];

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['status_change', 'assignment', 'priority_change', 'comment', 'created'],
      required: true,
    },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldValue: { type: String },
    newValue: { type: String },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'open',
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'medium',
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      default: 'general',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tags: [{ type: String, trim: true }],
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    activity: [activitySchema],
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    firstResponseAt: { type: Date },
    dueDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate ticket number
ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
  }

  // Set timestamps for status changes
  if (this.isModified('status')) {
    if (this.status === 'resolved') this.resolvedAt = new Date();
    if (this.status === 'closed') this.closedAt = new Date();
  }

  next();
});

// Virtual for comment count
ticketSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'ticket',
  count: true,
});

ticketSchema.index({ status: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.TICKET_STATUSES = TICKET_STATUSES;
module.exports.TICKET_PRIORITIES = TICKET_PRIORITIES;