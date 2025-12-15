import express from 'express';
import InterviewSession from '../models/InterviewSessionModel.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Create a new interview session
router.post('/', auth, async (req, res) => {
  try {
    const { interviewType, interviewerName, jobRole, company, chatLog, duration, feedback, status } = req.body;
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const session = new InterviewSession({
      userId,
      interviewType,
      interviewerName,
      jobRole,
      company,
      chatLog: chatLog || [],
      duration,
      feedback,
      status: status || 'in-progress'
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Error creating interview session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create interview session',
      error: error.message
    });
  }
});

// Update an existing interview session
router.put('/:id', auth, async (req, res) => {
  try {
    const { chatLog, duration, feedback, status } = req.body;
    
    const session = await InterviewSession.findByIdAndUpdate(
      req.params.id,
      { 
        $set: {
          ...(chatLog && { chatLog }),
          ...(duration !== undefined && { duration }),
          ...(feedback && { feedback }),
          ...(status && { status })
        }
      },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.json({
      success: true,
      message: 'Interview session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Error updating interview session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interview session',
      error: error.message
    });
  }
});

// Get all interview sessions for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { interviewType } = req.query;
    
    const query = { userId };
    if (interviewType) {
      query.interviewType = interviewType;
    }

    const sessions = await InterviewSession.find(query)
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching interview sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview sessions',
      error: error.message
    });
  }
});

// Get a specific interview session by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id).lean();
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching interview session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview session',
      error: error.message
    });
  }
});

// Get performance statistics for a user's interviews
router.get('/stats/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sessions = await InterviewSession.find({ userId })
      .sort({ timestamp: -1 })
      .lean();

    const total = sessions.length;
    const byType = {
      technical: sessions.filter(s => s.interviewType === 'technical').length,
      hr: sessions.filter(s => s.interviewType === 'hr').length,
      managerial: sessions.filter(s => s.interviewType === 'managerial').length,
      ai: sessions.filter(s => s.interviewType === 'ai').length
    };

    const recentSessions = sessions.slice(0, 5);

    res.json({
      success: true,
      data: {
        total,
        byType,
        recentSessions
      }
    });
  } catch (error) {
    console.error('Error fetching interview session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Delete an interview session
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await InterviewSession.findByIdAndDelete(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.json({
      success: true,
      message: 'Interview session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting interview session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete interview session',
      error: error.message
    });
  }
});

export default router;
