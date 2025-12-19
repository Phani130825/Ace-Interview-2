import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  practiceType: {
    type: String,
    enum: ['aptitude', 'coding', 'technical-interview', 'hr-interview', 'managerial-interview'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 30 // minutes
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient querying
scheduleSchema.index({ userId: 1, scheduledDate: 1 });
scheduleSchema.index({ scheduledDate: 1, status: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
