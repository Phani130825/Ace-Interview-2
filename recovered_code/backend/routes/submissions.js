import express from 'express';
import Submission from '../models/Submission.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/submissions/:userId
// @desc    Get all submissions for a user
// @access  Public (for coding round)
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const submissions = await Submission.find({ userId }).sort({ submittedAt: -1 });
  res.json({
    success: true,
    data: submissions
  });
}));

// @route   POST /api/submissions
// @desc    Save a new submission
// @access  Public (for coding round)
router.post('/', asyncHandler(async (req, res) => {
  const { userId, questionTitle, language, score, passedCount, totalTestCases, submittedAt, results } = req.body;

  const submission = new Submission({
    userId,
    questionTitle,
    language,
    score,
    passedCount,
    totalTestCases,
    submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
    results
  });

  await submission.save();

  res.status(201).json({
    success: true,
    message: 'Submission saved successfully',
    data: submission
  });
}));

export default router;
