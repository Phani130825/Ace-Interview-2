import mongoose from 'mongoose';

const pipelineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['tailoring', 'interview'], required: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  jobDescription: {
    title: String,
    company: String,
    description: String,
    requiredSkills: [String],
    responsibilities: [String],
    requirements: [String]
  },
  stages: { type: Object, default: {} },
  // Phase 2: Autonomous Task Agent Support
  scheduledTasks: {
    taskPlanId: String,
    taskPlan: mongoose.Schema.Types.Mixed,
    scheduledInterviews: [{
      scheduleId: String,
      week: Number,
      day: String,
      time: String,
      duration: Number,
      interviewType: String,
      topics: [String],
      difficulty: String
    }],
    cronJobs: [{
      jobId: String,
      schedule: String,
      action: String,
      description: String
    }],
    automationRules: {
      rescheduleIfMissed: { type: Boolean, default: true },
      autoNotifyUser: { type: Boolean, default: true },
      autoAdjustDifficulty: { type: Boolean, default: true },
      autoGenerateQuestions: { type: Boolean, default: true }
    },
    notificationSchedule: [{
      event: String,
      notifyBefore: String,
      messageTemplate: String
    }]
  },
  currentDifficulty: { type: String, default: 'medium' },
  lastDifficultyAdjustment: Date,
  nextReviewDate: Date,
  performanceHistory: [{
    week: Number,
    score: Number,
    adjustmentMade: Boolean,
    adjustmentType: String,
    timestamp: { type: Date, default: Date.now }
  }],
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

pipelineSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

pipelineSchema.methods.updateStage = function(stage, value = true) {
  this.stages = { ...(this.stages || {}), [stage]: value };
  this.metadata.updatedAt = new Date();
  return this.save();
};

pipelineSchema.index({ user: 1, type: 1, 'metadata.updatedAt': -1 });

const Pipeline = mongoose.model('Pipeline', pipelineSchema);

export default Pipeline;



