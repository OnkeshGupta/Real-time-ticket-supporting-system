require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Comment = require('./models/Comment');
const logger = require('./config/logger');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB for seeding...');

  await Promise.all([User.deleteMany(), Ticket.deleteMany(), Comment.deleteMany()]);
  logger.info('Cleared existing data');

  const [customer1, customer2, agent1, agent2] = await User.create([
    { name: 'Alice Johnson', email: 'customer@demo.com', password: 'demo123', role: 'customer' },
    { name: 'Bob Williams', email: 'customer2@demo.com', password: 'demo123', role: 'customer' },
    { name: 'Sarah Chen', email: 'agent@demo.com', password: 'demo123', role: 'agent' },
    { name: 'Mike Torres', email: 'agent2@demo.com', password: 'demo123', role: 'agent' },
  ]);
  logger.info('Created 4 demo users');

  const ticketData = [
    {
      title: 'Unable to login to my account',
      description: 'I have been trying to login for the past hour but keep getting an error message saying "Invalid credentials" even though I am sure my password is correct. I have tried resetting it twice already.',
      status: 'open', priority: 'high', category: 'technical',
      createdBy: customer1._id,
      activity: [{ type: 'created', description: 'Ticket created', performedBy: customer1._id, newValue: 'open' }],
    },
    {
      title: 'Billing charge appears twice on my statement',
      description: 'I was charged $49.99 twice on March 1st. My bank statement shows two identical charges from your company on the same day. Please investigate and refund the duplicate charge.',
      status: 'in_progress', priority: 'urgent', category: 'billing',
      createdBy: customer1._id, assignedTo: agent1._id,
      activity: [
        { type: 'created', description: 'Ticket created', performedBy: customer1._id, newValue: 'open' },
        { type: 'assignment', description: 'Assigned to agent', performedBy: agent1._id },
        { type: 'status_change', description: 'Status changed to In Progress', performedBy: agent1._id, oldValue: 'open', newValue: 'in_progress' },
      ],
    },
    {
      title: 'Feature request: Dark mode support',
      description: 'It would be really helpful to have a dark mode option in the application. Many users work late at night and the bright white interface causes eye strain.',
      status: 'open', priority: 'low', category: 'feature_request',
      createdBy: customer2._id,
      activity: [{ type: 'created', description: 'Ticket created', performedBy: customer2._id, newValue: 'open' }],
    },
    {
      title: 'App crashes when uploading large files',
      description: 'Whenever I try to upload a file larger than 10MB, the application crashes entirely. I lose all my work and have to restart. This is happening consistently on Chrome 121.',
      status: 'resolved', priority: 'high', category: 'bug_report',
      createdBy: customer2._id, assignedTo: agent2._id,
      resolvedAt: new Date(),
      activity: [
        { type: 'created', description: 'Ticket created', performedBy: customer2._id, newValue: 'open' },
        { type: 'assignment', description: 'Assigned to agent', performedBy: agent2._id },
        { type: 'status_change', description: 'Status changed to Resolved', performedBy: agent2._id, oldValue: 'in_progress', newValue: 'resolved' },
      ],
    },
    {
      title: 'How do I export my data?',
      description: 'I need to export all of my account data for compliance purposes. I looked through the settings but could not find an export option. Is this feature available?',
      status: 'waiting_for_customer', priority: 'medium', category: 'general',
      createdBy: customer1._id, assignedTo: agent1._id,
      activity: [
        { type: 'created', description: 'Ticket created', performedBy: customer1._id, newValue: 'open' },
        { type: 'status_change', description: 'Waiting for customer response', performedBy: agent1._id, oldValue: 'in_progress', newValue: 'waiting_for_customer' },
      ],
    },
  ];

  const tickets = await Ticket.create(ticketData);
  logger.info(`Created ${tickets.length} demo tickets`);

  await Comment.create([
    {
      ticket: tickets[1]._id, author: agent1._id,
      content: "Hi Alice, I can see the duplicate charge on our end. I've initiated a refund for $49.99 which should appear within 3-5 business days. I apologize for the inconvenience!",
      isInternal: false,
    },
    {
      ticket: tickets[1]._id, author: customer1._id,
      content: 'Thank you for looking into this so quickly! I will watch for the refund.',
      isInternal: false,
    },
    {
      ticket: tickets[1]._id, author: agent1._id,
      content: '[INTERNAL] Duplicate charge was caused by a webhook retry bug. Engineering has been notified. Ticket #ENG-4521 opened.',
      isInternal: true,
    },
    {
      ticket: tickets[4]._id, author: agent1._id,
      content: 'Hi! Data export is available under Settings > Account > Export Data. You can export in CSV or JSON format. Could you confirm which format you need?',
      isInternal: false,
    },
  ]);
  logger.info('Created demo comments');

  logger.info('\n✅ Seed complete! Demo accounts:');
  logger.info('  Customer: customer@demo.com / demo123');
  logger.info('  Agent:    agent@demo.com    / demo123');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});