const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },

  role: {
    type: String,
    enum: ['customer', 'agent', 'admin'],
    default: 'customer'
  },

  avatar: {
    type: String,
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastSeen: {
    type: Date,
    default: Date.now
  }

},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
);

userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      if (typeof next === 'function') return next();
      return;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    if (typeof next === 'function') next();
  } catch (error) {
    if (typeof next === 'function') next(error);
    else throw error;
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('ticketCount', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'createdBy',
  count: true
});

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);