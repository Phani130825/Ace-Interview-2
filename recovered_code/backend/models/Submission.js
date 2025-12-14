import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  questionTitle: { type: String, required: true },
  language: { type: String, required: true },
  score: { type: Number, required: true },
  passedCount: { type: Number, required: true },
  totalTestCases: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
  results: { type: String, required: true }, // JSON stringified results
}, {
  timestamps: true,
});

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
