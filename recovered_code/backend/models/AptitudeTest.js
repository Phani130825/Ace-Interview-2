import mongoose from 'mongoose';

const aptitudeTestSchema = new mongoose.Schema({
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
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    userAnswer: String,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number, // in seconds
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
aptitudeTestSchema.index({ userId: 1, timestamp: -1 });

const AptitudeTest = mongoose.models.AptitudeTest || mongoose.model('AptitudeTest', aptitudeTestSchema);
export default AptitudeTest;
