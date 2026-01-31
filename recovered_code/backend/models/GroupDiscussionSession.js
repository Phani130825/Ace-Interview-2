/**
 * Group Discussion Session Model
 * Stores conversation history and metadata for group discussions
 */

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  agent: {
    type: String,
    enum: ['user', 'facilitator', 'analyst', 'creative', 'pragmatist', 'devil_advocate'],
    required: true
  },
  name: String,
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const groupDiscussionSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  topic: {
    type: String,
    required: true
  },
  
  description: String,
  
  selectedAgents: [String],
  
  context: mongoose.Schema.Types.Mixed,
  
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  
  messages: [messageSchema],
  
  summary: String,
  
  consensusAnalysis: mongoose.Schema.Types.Mixed,
  
  finalMetrics: {
    totalTurns: Number,
    duration: Number,
    agentParticipation: mongoose.Schema.Types.Mixed,
    topic: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: Date
});

// Update updatedAt on save
groupDiscussionSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const GroupDiscussionSession = mongoose.model('GroupDiscussionSession', groupDiscussionSessionSchema);

export default GroupDiscussionSession;
