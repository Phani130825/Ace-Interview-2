import mongoose from 'mongoose';

const InterviewSessionSchema = new mongoose.Schema({
  interviewId: {
    type: String,
    required: true
  },
  transcript: {
    type: Array,
    default: []
  },
  score: {
    type: Number,
    required: true
  },
  strengths: {
    type: [String],
    default: []
  },
  weaknesses: {
    type: [String],
    default: []
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const InterviewSession = mongoose.model('InterviewSession', InterviewSessionSchema);

export default InterviewSession;
