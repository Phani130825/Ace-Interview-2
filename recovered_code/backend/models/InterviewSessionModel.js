import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  interviewType: {
    type: String,
    enum: ['technical', 'hr', 'managerial', 'ai'],
    required: true
  },
  interviewerName: {
    type: String,
    required: true
  },
  jobRole: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  chatLog: [{
    speaker: String,
    text: String,
    timestamp: Number
  }],
  duration: {
    type: Number, // in seconds
    required: false
  },
  feedback: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['completed', 'in-progress', 'early-exit'],
    default: 'in-progress'
  }
}, {
  timestamps: true
});

// Index for efficient queries
interviewSessionSchema.index({ userId: 1, timestamp: -1 });
interviewSessionSchema.index({ userId: 1, interviewType: 1 });

const InterviewSession = mongoose.models.InterviewSession || mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewSession;
