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
    timeTaken: Number,
    // AI Evaluator analysis
    codeQuality: {
      score: { type: Number, default: 0 },
      readability: { type: Number, default: 0 },
      maintainability: { type: Number, default: 0 }
    },
    logicCorrect: { type: Boolean, default: false },
    edgeCasesHandled: [String],
    edgeCasesMissing: [String],
    timeComplexity: String,
    spaceComplexity: String,
    topicsIdentified: [String],
    strengthAreas: [String],
    weakAreas: [String]
  },
  // Step 3: Technical Interview
  technicalInterview: {
    questions: [mongoose.Schema.Types.Mixed],
    answers: [mongoose.Schema.Types.Mixed],
    score: { type: Number, default: 0 },
    feedback: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    duration: Number,
    // AI Interviewer analysis
    topicsCovered: [String],
    strongTopics: [String],
    weakTopics: [String],
    adaptiveDifficulty: {
      initialDifficulty: { type: String, default: 'medium' },
      finalDifficulty: String,
      difficultyProgression: [String]
    },
    questionAnalysis: [{
      question: String,
      score: Number,
      topic: String,
      difficulty: String
    }]
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
    duration: Number,
    // HR Behavior analysis
    communicationScore: { type: Number, default: 0 },
    confidenceLevel: { type: Number, default: 0 },
    redFlags: [String],
    greenFlags: [String],
    competenciesDemonstrated: [String],
    cultureAlignment: { type: Number, default: 0 },
    responseAnalysis: [{
      question: String,
      score: Number,
      category: String,
      confidence: Number
    }]
  },
  // Performance Tracking & Weak Areas
  performanceMetrics: {
    // Topics identified as weak across all rounds
    weakTopics: [{
      topic: String,
      occurrences: { type: Number, default: 1 },
      firstIdentifiedAt: { type: String, enum: ['coding', 'technical', 'hr'] },
      scores: [Number],
      recommendedFocus: Boolean
    }],
    strongTopics: [{
      topic: String,
      occurrences: { type: Number, default: 1 },
      scores: [Number]
    }],
    overallWeakness: [String],
    overallStrength: [String],
    // AI Agent Recommendations
    agentRecommendations: {
      interviewerAgent: {
        areasToFocus: [String],
        estimatedDifficultyGap: String,
        suggestedTopics: [String]
      },
      codingEvaluator: {
        weakTopics: [String],
        suggestedProblems: [{
          title: String,
          topic: String,
          difficulty: String
        }],
        estimatedTimeToMastery: String
      },
      hrBehavior: {
        strengths: [String],
        areasForGrowth: [String],
        cultureAlignment: { type: Number, default: 0 }
      }
    }
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
  recommendations: [String],
  // Phase 2 Agent Data - Mentor Agent
  mentorInsights: {
    performanceAnalysis: mongoose.Schema.Types.Mixed,
    learningRoadmap: mongoose.Schema.Types.Mixed,
    personalisedRecommendations: mongoose.Schema.Types.Mixed,
    progressTracking: mongoose.Schema.Types.Mixed,
    roadmapId: String,
    roadmapStartedAt: Date,
    roadmapCompletionPercentage: { type: Number, default: 0 }
  },
  // Phase 2 Agent Data - Company Simulation Agent
  companySimulation: {
    companyProfile: mongoose.Schema.Types.Mixed,
    targetCompany: String,
    targetRole: String,
    customizedQuestions: mongoose.Schema.Types.Mixed,
    behavioralQuestions: mongoose.Schema.Types.Mixed,
    customizedFlow: mongoose.Schema.Types.Mixed,
    companyFitAnalysis: mongoose.Schema.Types.Mixed,
    companyFitScore: { type: Number, default: 0 },
    cultureFitScore: { type: Number, default: 0 },
    roleFitScore: { type: Number, default: 0 }
  },
  // Phase 2 Agent Data - Autonomous Task Agent
  autonomousPlanning: {
    taskPlanId: String,
    taskPlan: mongoose.Schema.Types.Mixed,
    currentWeek: { type: Number, default: 1 },
    scheduledInterviews: mongoose.Schema.Types.Mixed,
    completedTasks: [{
      taskId: String,
      completedAt: Date,
      performanceScore: Number
    }],
    currentDifficulty: { type: String, default: 'medium' },
    lastDifficultyAdjustment: Date,
    nextScheduledReview: Date,
    notifications: [{
      type: String,
      sentAt: Date,
      message: String
    }]
  }
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
