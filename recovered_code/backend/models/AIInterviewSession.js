import mongoose from 'mongoose';

const aiInterviewSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobDetails: {
    role: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    resumeText: {
      type: String,
      required: true
    }
  },
  interviewType: {
    type: String,
    enum: ['Technical', 'Managerial', 'HR', 'General', 'Technical Review', 'Behavioral'],
    default: 'General'
  },
  state: {
    type: String,
    enum: ['setup', 'in-progress', 'feedback', 'completed'],
    default: 'setup'
  },
  log: [{
    speaker: {
      type: String,
      enum: ['System', 'Interviewer', 'You', 'Feedback', 'Enhancement', 'Error'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Number,
      required: true
    }
  }],
  evaluation: {
    overallScore: Number,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  metadata: {
    startedAt: Date,
    completedAt: Date,
    totalQuestions: {
      type: Number,
      default: 0
    },
    totalAnswers: {
      type: Number,
      default: 0
    },
    duration: Number // in seconds
  }
}, {
  timestamps: true
});

// Index for faster queries
aiInterviewSessionSchema.index({ user: 1, createdAt: -1 });
aiInterviewSessionSchema.index({ state: 1 });

// Method to add log entry
aiInterviewSessionSchema.methods.addLogEntry = function(speaker, text) {
  this.log.push({
    speaker,
    text,
    timestamp: Date.now()
  });
  return this.save();
};

// Method to update state
aiInterviewSessionSchema.methods.updateState = function(newState) {
  this.state = newState;
  if (newState === 'in-progress' && !this.metadata.startedAt) {
    this.metadata.startedAt = new Date();
  }
  if (newState === 'completed' || newState === 'feedback') {
    this.metadata.completedAt = new Date();
    if (this.metadata.startedAt) {
      this.metadata.duration = Math.floor(
        (this.metadata.completedAt - this.metadata.startedAt) / 1000
      );
    }
  }
  return this.save();
};

// Static method to get active session for user
aiInterviewSessionSchema.statics.getActiveSession = function(userId) {
  return this.findOne({
    user: userId,
    state: { $in: ['setup', 'in-progress'] }
  }).sort({ createdAt: -1 });
};

// Static method to get recent sessions
aiInterviewSessionSchema.statics.getRecentSessions = function(userId, limit = 10) {
  return this.find({
    user: userId
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('jobDetails interviewType state metadata createdAt');
};

const AIInterviewSession = mongoose.model('AIInterviewSession', aiInterviewSessionSchema);

export default AIInterviewSession;
