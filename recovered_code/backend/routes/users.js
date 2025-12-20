import express from 'express';
import User from '../models/User.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Job cache to prevent excessive API calls
// Cache structure: { userId: { jobs: [], dreamCompanyJobs: [], timestamp: Date } }
const jobCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, profilePicture } = req.body;

  // Validation
  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'First name and last name are required'
    });
  }

  // Update user profile
  const user = await User.findById(req.user._id);
  user.firstName = firstName;
  user.lastName = lastName;
  
  if (profilePicture) {
    user.profilePicture = profilePicture;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const { interviewTypes, notifications, privacy } = req.body;

  const user = await User.findById(req.user._id);

  if (interviewTypes) {
    user.preferences.interviewTypes = interviewTypes;
  }

  if (notifications) {
    user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
  }

  if (privacy) {
    user.preferences.privacy = { ...user.preferences.privacy, ...privacy };
  }

  await user.save();

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
}));

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long'
    });
  }

  const user = await User.findById(req.user._id);

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('stats preferences');

  res.json({
    success: true,
    data: {
      stats: user.stats,
      preferences: user.preferences
    }
  });
}));

// @route   POST /api/users/subscription
// @desc    Update subscription status
// @access  Private
router.post('/subscription', requirePremium, asyncHandler(async (req, res) => {
  const { subscriptionType, expiryDate } = req.body;

  if (!subscriptionType || !expiryDate) {
    return res.status(400).json({
      success: false,
      error: 'Subscription type and expiry date are required'
    });
  }

  const user = await User.findById(req.user._id);
  user.subscription = subscriptionType;
  user.subscriptionExpiry = new Date(expiryDate);

  await user.save();

  res.json({
    success: true,
    message: 'Subscription updated successfully',
    data: {
      subscription: user.subscription,
      subscriptionExpiry: user.subscriptionExpiry
    }
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required to delete account'
    });
  }

  const user = await User.findById(req.user._id);

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Password is incorrect'
    });
  }

  // Deactivate account instead of deleting
  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

// @route   PUT /api/users/api-keys/gemini
// @desc    Update user's Gemini API key
// @access  Private
router.put('/api-keys/gemini', asyncHandler(async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Valid API key is required'
    });
  }

  // Update user's Gemini API key using the model method
  const user = await User.findById(req.user._id);
  
  try {
    user.setApiKey('gemini', apiKey.trim());
    await user.save();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to save API key'
    });
  }

  res.json({
    success: true,
    message: 'Gemini API key saved successfully'
  });
}));

// @route   GET /api/users/api-keys/gemini
// @desc    Get user's Gemini API key (masked)
// @access  Private
router.get('/api-keys/gemini', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const hasKey = user.hasApiKey('gemini');
  let maskedKey = null;
  let fullKey = null;
  
  if (hasKey) {
    fullKey = user.getApiKey('gemini');
    if (fullKey && fullKey.length > 12) {
      maskedKey = `${fullKey.substring(0, 8)}...${fullKey.substring(fullKey.length - 4)}`;
    } else if (fullKey) {
      maskedKey = fullKey.substring(0, 4) + '...';
    }
  }

  res.json({
    success: true,
    data: {
      hasKey,
      maskedKey,
      apiKey: fullKey // Send full key for actual use
    }
  });
}));

// @route   DELETE /api/users/api-keys/gemini
// @desc    Remove user's Gemini API key
// @access  Private
router.delete('/api-keys/gemini', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await user.removeApiKey('gemini');
  await user.save();

  res.json({
    success: true,
    message: 'Gemini API key removed successfully'
  });
}));

// @route   PUT /api/users/job-preferences
// @desc    Update user's job preferences
// @access  Private
router.put('/job-preferences', asyncHandler(async (req, res) => {
  const { jobPreferences } = req.body;
  
  const user = await User.findById(req.user._id);
  user.jobPreferences = jobPreferences;
  await user.save();

  res.json({
    success: true,
    message: 'Job preferences updated successfully',
    data: {
      jobPreferences: user.jobPreferences
    }
  });
}));

// Helper function to fetch jobs from Jooble API
const fetchJobsFromJooble = async (prefs, joobleApiKey) => {
  // Build keywords from roles of interest
  const keywords = [...prefs.rolesOfInterest];
  
  // Add experience level keywords
  if (prefs.experienceLevel) {
    switch (prefs.experienceLevel) {
      case 'entry':
        keywords.push('entry level', 'fresher', 'junior', 'graduate', 'trainee');
        break;
      case 'mid':
        keywords.push('mid level', 'intermediate', 'experienced');
        break;
      case 'senior':
        keywords.push('senior', 'lead', 'principal');
        break;
      case 'lead':
        keywords.push('lead', 'manager', 'head', 'director');
        break;
    }
  }
  
  // Add job type keywords
  if (prefs.jobType && prefs.jobType !== '') {
    keywords.push(prefs.jobType);
  }
  
  // Add top skills
  if (prefs.skills && prefs.skills.length > 0) {
    keywords.push(...prefs.skills.slice(0, 3));
  }

  const searchQuery = {
    keywords: keywords.join(' '),
    location: [prefs.location?.city, prefs.location?.country]
      .filter(Boolean)
      .join(', ') || 'Remote',
    page: 1
  };

  const response = await fetch(`https://jooble.org/api/${joobleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchQuery)
  });

  if (!response.ok) {
    throw new Error(`Jooble API error: ${response.status}`);
  }

  const data = await response.json();
  return data.jobs || [];
};

// @route   GET /api/users/jobs
// @desc    Fetch personalized job recommendations from Jooble API (with caching)
// @access  Private
router.get('/jobs', asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const user = await User.findById(req.user._id);
  const prefs = user.jobPreferences || {};
  
  // If user has no preferences, return empty
  if (!prefs.rolesOfInterest || prefs.rolesOfInterest.length === 0) {
    return res.json({
      success: true,
      data: {
        jobs: [],
        message: 'Please add job preferences in Settings to see job recommendations'
      }
    });
  }

  // Check cache first
  const cachedData = jobCache.get(userId);
  const now = Date.now();
  
  if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
    console.log('Returning cached jobs for user:', userId);
    return res.json({
      success: true,
      data: {
        jobs: cachedData.jobs,
        totalJobs: cachedData.totalJobs,
        cached: true,
        cacheExpiresIn: Math.round((CACHE_DURATION - (now - cachedData.timestamp)) / 1000)
      }
    });
  }

  try {
    const joobleApiKey = process.env.JOOBLE_API_KEY;
    if (!joobleApiKey) {
      throw new Error('Jooble API key not configured');
    }

    // Fetch jobs from Jooble API
    const allJobs = await fetchJobsFromJooble(prefs, joobleApiKey);
    
    // Deduplicate jobs by link (unique identifier)
    const uniqueJobs = [];
    const seenLinks = new Set();
    
    for (const job of allJobs) {
      if (!seenLinks.has(job.link)) {
        seenLinks.add(job.link);
        
        // Filter by experience level if specified
        if (prefs.experienceLevel && prefs.experienceLevel !== '') {
          const titleLower = (job.title + ' ' + (job.snippet || '')).toLowerCase();
          
          let matchesExperience = false;
          switch (prefs.experienceLevel) {
            case 'entry':
              matchesExperience = titleLower.includes('entry') || 
                                  titleLower.includes('junior') || 
                                  titleLower.includes('fresher') || 
                                  titleLower.includes('graduate') ||
                                  titleLower.includes('trainee') ||
                                  (!titleLower.includes('senior') && !titleLower.includes('lead'));
              break;
            case 'mid':
              matchesExperience = !titleLower.includes('senior') && 
                                  !titleLower.includes('lead') &&
                                  !titleLower.includes('junior') &&
                                  !titleLower.includes('entry');
              break;
            case 'senior':
              matchesExperience = titleLower.includes('senior') || 
                                  titleLower.includes('principal');
              break;
            case 'lead':
              matchesExperience = titleLower.includes('lead') || 
                                  titleLower.includes('manager') ||
                                  titleLower.includes('director') ||
                                  titleLower.includes('head');
              break;
            default:
              matchesExperience = true;
          }
          
          if (matchesExperience) {
            uniqueJobs.push(job);
          }
        } else {
          uniqueJobs.push(job);
        }
      }
    }
    
    // Separate jobs into dream company and regular jobs
    let dreamCompanyJobs = [];
    let regularJobs = [];
    
    if (prefs.dreamCompanies && prefs.dreamCompanies.length > 0) {
      const dreamCompanyLower = prefs.dreamCompanies.map(c => c.toLowerCase());
      
      dreamCompanyJobs = uniqueJobs.filter(job => 
        dreamCompanyLower.some(company => 
          job.company.toLowerCase().includes(company)
        )
      );
      
      regularJobs = uniqueJobs.filter(job => 
        !dreamCompanyLower.some(company => 
          job.company.toLowerCase().includes(company)
        )
      );
    } else {
      regularJobs = uniqueJobs;
    }

    // Prioritize dream company jobs, then add regular jobs
    const jobs = [...dreamCompanyJobs, ...regularJobs].slice(0, 10);

    const formattedJobs = jobs.map(job => ({
      title: job.title,
      company: job.company,
      location: job.location,
      snippet: job.snippet,
      salary: job.salary,
      type: job.type,
      link: job.link,
      updated: job.updated
    }));

    const formattedDreamJobs = dreamCompanyJobs.slice(0, 10).map(job => ({
      title: job.title,
      company: job.company,
      location: job.location,
      snippet: job.snippet,
      salary: job.salary,
      type: job.type,
      link: job.link,
      updated: job.updated
    }));

    // Cache the results
    jobCache.set(userId, {
      jobs: formattedJobs,
      dreamCompanyJobs: formattedDreamJobs,
      totalJobs: uniqueJobs.length,
      timestamp: now
    });

    res.json({
      success: true,
      data: {
        jobs: formattedJobs,
        totalJobs: uniqueJobs.length,
        cached: false
      }
    });
  } catch (error) {
    console.error('Jooble API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job recommendations. Please try again later.'
    });
  }
}));

// @route   GET /api/users/jobs/dream-companies
// @desc    Fetch jobs ONLY from dream companies (with caching)
// @access  Private
router.get('/jobs/dream-companies', asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const user = await User.findById(req.user._id);
  const prefs = user.jobPreferences || {};
  
  // If user has no dream companies, return empty
  if (!prefs.dreamCompanies || prefs.dreamCompanies.length === 0) {
    return res.json({
      success: true,
      data: {
        jobs: [],
        message: 'Please add dream companies in Settings to see these job recommendations'
      }
    });
  }

  if (!prefs.rolesOfInterest || prefs.rolesOfInterest.length === 0) {
    return res.json({
      success: true,
      data: {
        jobs: [],
        message: 'Please add roles of interest in Settings'
      }
    });
  }

  // Check cache first
  const cachedData = jobCache.get(userId);
  const now = Date.now();
  
  if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
    console.log('Returning cached dream company jobs for user:', userId);
    return res.json({
      success: true,
      data: {
        jobs: cachedData.dreamCompanyJobs,
        cached: true,
        cacheExpiresIn: Math.round((CACHE_DURATION - (now - cachedData.timestamp)) / 1000)
      }
    });
  }

  try {
    const joobleApiKey = process.env.JOOBLE_API_KEY;
    if (!joobleApiKey) {
      throw new Error('Jooble API key not configured');
    }

    // Fetch jobs from Jooble API
    const allJobs = await fetchJobsFromJooble(prefs, joobleApiKey);
    
    // Deduplicate jobs by link (unique identifier)
    const uniqueJobs = [];
    const seenLinks = new Set();
    
    for (const job of allJobs) {
      if (!seenLinks.has(job.link)) {
        seenLinks.add(job.link);
        
        // Filter by experience level if specified
        if (prefs.experienceLevel && prefs.experienceLevel !== '') {
          const titleLower = (job.title + ' ' + (job.snippet || '')).toLowerCase();
          
          let matchesExperience = false;
          switch (prefs.experienceLevel) {
            case 'entry':
              matchesExperience = titleLower.includes('entry') || 
                                  titleLower.includes('junior') || 
                                  titleLower.includes('fresher') || 
                                  titleLower.includes('graduate') ||
                                  titleLower.includes('trainee') ||
                                  (!titleLower.includes('senior') && !titleLower.includes('lead'));
              break;
            case 'mid':
              matchesExperience = !titleLower.includes('senior') && 
                                  !titleLower.includes('lead') &&
                                  !titleLower.includes('junior') &&
                                  !titleLower.includes('entry');
              break;
            case 'senior':
              matchesExperience = titleLower.includes('senior') || 
                                  titleLower.includes('principal');
              break;
            case 'lead':
              matchesExperience = titleLower.includes('lead') || 
                                  titleLower.includes('manager') ||
                                  titleLower.includes('director') ||
                                  titleLower.includes('head');
              break;
            default:
              matchesExperience = true;
          }
          
          if (matchesExperience) {
            uniqueJobs.push(job);
          }
        } else {
          uniqueJobs.push(job);
        }
      }
    }
    
    // Filter ONLY dream company jobs
    const dreamCompanyLower = prefs.dreamCompanies.map(c => c.toLowerCase());
    const dreamCompanyJobs = uniqueJobs.filter(job => 
      dreamCompanyLower.some(company => 
        job.company.toLowerCase().includes(company)
      )
    ).slice(0, 10);

    const formattedDreamJobs = dreamCompanyJobs.map(job => ({
      title: job.title,
      company: job.company,
      location: job.location,
      snippet: job.snippet,
      salary: job.salary,
      type: job.type,
      link: job.link,
      updated: job.updated
    }));

    // Update cache if not exists (jobs endpoint will also populate this)
    if (!cachedData) {
      const regularJobs = uniqueJobs.filter(job => 
        !dreamCompanyLower.some(company => 
          job.company.toLowerCase().includes(company)
        )
      );
      const mixedJobs = [...dreamCompanyJobs, ...regularJobs].slice(0, 10).map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        snippet: job.snippet,
        salary: job.salary,
        type: job.type,
        link: job.link,
        updated: job.updated
      }));

      jobCache.set(userId, {
        jobs: mixedJobs,
        dreamCompanyJobs: formattedDreamJobs,
        totalJobs: uniqueJobs.length,
        timestamp: now
      });
    }

    res.json({
      success: true,
      data: {
        jobs: formattedDreamJobs,
        cached: false
      }
    });
  } catch (error) {
    console.error('Jooble API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dream company jobs. Please try again later.'
    });
  }
}));

export default router;
