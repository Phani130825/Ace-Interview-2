import mongoose from 'mongoose';

const placementSimulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  currentStep: {
    type: Number,
    default: 0,
    min: 0,
    max: 6
  },
  // Step 0: Resume
  resume: {
    text: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    score: { type: Number, default: 0 }
  },
  // Step 1: Aptitude Test
  aptitude: {
    questions: [mongoose.Schema.Types.Mixed],
    answers: [mongoose.Schema.Types.Mixed],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    timeTaken: Number
  },
  // Step 2: Coding Round
  coding: {
    questionTitle: String,
    code: String,
    language: String,
    testsPassed: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    timeTaken: Number
  },
  // Step 3: Technical Interview
  technicalInterview: {
    questions: [mongoose.Schema.Types.Mixed],
    answers: [mongoose.Schema.Types.Mixed],
    score: { type: Number, default: 0 },
    feedback: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    duration: Number
  },
  // Step 4: Managerial Interview
  managerialInterview: {
    questions: [mongoose.Schema.Types.Mixed],
    answers: [mongoose.Schema.Types.Mixed],
    score: { type: Number, default: 0 },
    feedback: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    duration: Number
  },
  // Step 5: HR Interview
  hrInterview: {
    questions: [mongoose.Schema.Types.Mixed],
    answers: [mongoose.Schema.Types.Mixed],
    score: { type: Number, default: 0 },
    feedback: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    duration: Number
  },
  // Overall Analytics
  overallScore: {
    type: Number,
    default: 0
  },
  totalTimeTaken: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  recommendations: [String]
}, {
  timestamps: true
});

// Index for efficient querying
placementSimulationSchema.index({ userId: 1, status: 1 });
placementSimulationSchema.index({ createdAt: -1 });

// Method to calculate overall score
placementSimulationSchema.methods.calculateOverallScore = function() {
  let totalScore = 0;
  let completedSteps = 0;

  if (this.resume.completed) {
    totalScore += this.resume.score || 0;
    completedSteps++;
  }
  if (this.aptitude.completed) {
    totalScore += this.aptitude.score || 0;
    completedSteps++;
  }
  if (this.coding.completed) {
    totalScore += this.coding.score || 0;
    completedSteps++;
  }
  if (this.technicalInterview.completed) {
    totalScore += this.technicalInterview.score || 0;
    completedSteps++;
  }
  if (this.managerialInterview.completed) {
    totalScore += this.managerialInterview.score || 0;
    completedSteps++;
  }
  if (this.hrInterview.completed) {
    totalScore += this.hrInterview.score || 0;
    completedSteps++;
  }

  this.overallScore = completedSteps > 0 ? totalScore / completedSteps : 0;
  return this.overallScore;
};

// Method to get progress percentage
placementSimulationSchema.methods.getProgress = function() {
  const totalSteps = 6;
  return (this.currentStep / totalSteps) * 100;
};

const PlacementSimulation = mongoose.model('PlacementSimulation', placementSimulationSchema);

export default PlacementSimulation;
