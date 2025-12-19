import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../services/encryptionService.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  profilePicture: {
    type: String,
    default: null
  },
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  preferences: {
    interviewTypes: [{
      type: String,
      enum: ['hr', 'managerial', 'technical']
    }],
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      shareAnalytics: { type: Boolean, default: false },
      publicProfile: { type: Boolean, default: false }
    }
  },
  apiKeys: {
    gemini: {
      encrypted: {
        type: String,
        default: null
      },
      createdAt: {
        type: Date,
        default: null
      },
      lastUsed: {
        type: Date,
        default: null
      }
    },
    openai: {
      encrypted: {
        type: String,
        default: null
      },
      createdAt: {
        type: Date,
        default: null
      },
      lastUsed: {
        type: Date,
        default: null
      }
    },
    judge0: {
      encrypted: {
        type: String,
        default: null
      },
      createdAt: {
        type: Date,
        default: null
      },
      lastUsed: {
        type: Date,
        default: null
      }
    }
  },
  jobPreferences: {
    rolesOfInterest: [{
      type: String,
      trim: true
    }],
    dreamCompanies: [{
      type: String,
      trim: true
    }],
    skills: [{
      type: String,
      trim: true
    }],
    location: {
      city: {
        type: String,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        trim: true,
        default: ''
      }
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', ''],
      default: ''
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', ''],
      default: ''
    }
  },
  stats: {
    totalInterviews: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    totalPracticeTime: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Index for better query performance
// Note: email index is automatically created by unique: true in schema
userSchema.index({ subscription: 1 });
userSchema.index({ 'stats.lastActive': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add validation error logging
userSchema.pre('save', function(next) {
  console.log('User model validation - saving user:', {
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    hasPassword: !!this.password
  });
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

// Method to update stats
userSchema.methods.updateStats = function(interviewScore, practiceTime) {
  this.stats.totalInterviews += 1;
  this.stats.totalPracticeTime += practiceTime || 0;
  
  // Update average score
  const currentTotal = this.stats.averageScore * (this.stats.totalInterviews - 1);
  this.stats.averageScore = (currentTotal + interviewScore) / this.stats.totalInterviews;
  
  this.stats.lastActive = new Date();
  return this.save();
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to set an encrypted API key
userSchema.methods.setApiKey = function(service, apiKey) {
  if (!['gemini', 'openai', 'judge0'].includes(service)) {
    throw new Error('Invalid service. Must be one of: gemini, openai, judge0');
  }
  
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  
  // Encrypt the API key
  const encryptedKey = encrypt(apiKey);
  
  // Store encrypted key with metadata
  this.apiKeys[service] = {
    encrypted: encryptedKey,
    createdAt: new Date(),
    lastUsed: null
  };
  
  console.log(`API key for ${service} encrypted and stored for user ${this.email}`);
};

// Method to get a decrypted API key
userSchema.methods.getApiKey = function(service) {
  if (!['gemini', 'openai', 'judge0'].includes(service)) {
    throw new Error('Invalid service. Must be one of: gemini, openai, judge0');
  }
  
  const apiKeyData = this.apiKeys[service];
  
  if (!apiKeyData || !apiKeyData.encrypted) {
    return null;
  }
  
  try {
    // Decrypt the API key
    const decryptedKey = decrypt(apiKeyData.encrypted);
    
    // Update last used timestamp (but don't save automatically)
    apiKeyData.lastUsed = new Date();
    
    return decryptedKey;
  } catch (error) {
    console.error(`Error decrypting ${service} API key for user ${this.email}:`, error);
    return null;
  }
};

// Method to check if user has an API key for a service
userSchema.methods.hasApiKey = function(service) {
  if (!['gemini', 'openai', 'judge0'].includes(service)) {
    return false;
  }
  
  return !!(this.apiKeys[service] && this.apiKeys[service].encrypted);
};

// Method to remove an API key
userSchema.methods.removeApiKey = async function(service) {
  if (!['gemini', 'openai', 'judge0'].includes(service)) {
    throw new Error('Invalid service. Must be one of: gemini, openai, judge0');
  }
  
  this.apiKeys[service] = {
    encrypted: null,
    createdAt: null,
    lastUsed: null
  };
  
  console.log(`API key for ${service} removed for user ${this.email}`);
};

// Method to get API key metadata (without exposing the actual key)
userSchema.methods.getApiKeyMetadata = function(service) {
  if (!['gemini', 'openai', 'judge0'].includes(service)) {
    return null;
  }
  
  const apiKeyData = this.apiKeys[service];
  
  if (!apiKeyData || !apiKeyData.encrypted) {
    return {
      exists: false,
      createdAt: null,
      lastUsed: null
    };
  }
  
  return {
    exists: true,
    createdAt: apiKeyData.createdAt,
    lastUsed: apiKeyData.lastUsed
  };
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
