import express from 'express';
import AptitudeTest from '../models/AptitudeTest.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Save a new aptitude test result
router.post('/', auth, async (req, res) => {
  try {
    const { questions, score, totalQuestions, percentage, timeTaken } = req.body;
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const aptitudeTest = new AptitudeTest({
      userId,
      questions,
      score,
      totalQuestions,
      percentage,
      timeTaken
    });

    await aptitudeTest.save();

    res.status(201).json({
      success: true,
      message: 'Aptitude test saved successfully',
      data: aptitudeTest
    });
  } catch (error) {
    console.error('Error saving aptitude test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save aptitude test',
      error: error.message
    });
  }
});

// Get all aptitude tests for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tests = await AptitudeTest.find({ userId })
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error('Error fetching aptitude tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch aptitude tests',
      error: error.message
    });
  }
});

// Get a specific aptitude test by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await AptitudeTest.findById(req.params.id).lean();
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Aptitude test not found'
      });
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('Error fetching aptitude test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch aptitude test',
      error: error.message
    });
  }
});

// Get performance statistics for a user
router.get('/stats/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tests = await AptitudeTest.find({ userId })
      .sort({ timestamp: -1 })
      .lean();

    const total = tests.length;
    const averageScore = total > 0 
      ? tests.reduce((sum, test) => sum + test.percentage, 0) / total 
      : 0;

    const recentTests = tests.slice(0, 5);

    res.json({
      success: true,
      data: {
        total,
        averageScore: Math.round(averageScore * 10) / 10,
        recentTests
      }
    });
  } catch (error) {
    console.error('Error fetching aptitude test stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Delete an aptitude test
router.delete('/:id', auth, async (req, res) => {
  try {
    const test = await AptitudeTest.findByIdAndDelete(req.params.id);
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Aptitude test not found'
      });
    }

    res.json({
      success: true,
      message: 'Aptitude test deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting aptitude test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete aptitude test',
      error: error.message
    });
  }
});

export default router;
