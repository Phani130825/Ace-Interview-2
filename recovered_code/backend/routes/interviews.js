import express from 'express';
import mongoose from 'mongoose';
import Interview from '../models/Interview.js';
import Resume from '../models/Resume.js';
import InterviewSession from '../models/InterviewSession.js';
import aiService from '../services/aiService.js';
import Pipeline from '../models/Pipeline.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { io } from '../server.js';

const router = express.Router();

// @route   POST /api/interviews/create
// @desc    Create a new interview session
// @access  Private
router.post('/create', asyncHandler(async (req, res) => {
  const { resumeId, jobDescription, interviewType, settings, pipelineId } = req.body;

  let finalResumeId = resumeId;
  let finalJobDescription = jobDescription;

  // If pipelineId is provided, use pipeline data
  if (pipelineId) {
    const pipeline = await Pipeline.findOne({
      _id: pipelineId,
      user: req.user._id,
      type: { $in: ['tailoring', 'interview'] }
    });

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    finalResumeId = pipeline.resume;
    finalJobDescription = pipeline.jobDescription?.description || pipeline.jobDescription;
  }

  // Validation
  if (!finalResumeId || !finalJobDescription || !interviewType) {
    return res.status(400).json({
      success: false,
      error: 'Resume ID, job description, and interview type are required'
    });
  }

  // Check if resume exists and belongs to user
  const resume = await Resume.findOne({
    _id: finalResumeId,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  // Allow interview creation if resume has been parsed or analyzed
  if (resume.status !== 'analyzed' && resume.status !== 'parsed') {
    if (!resume.parsedData || !resume.parsedData.fullText) {
      return res.status(400).json({
        success: false,
        error: 'Resume must be parsed before creating an interview'
      });
    }
  }

  try {
    // Get optimized resume text if available
    let optimizedResumeText = null;
    if (resume.tailoredVersions && resume.tailoredVersions.length > 0) {
      const latestTailored = resume.tailoredVersions[resume.tailoredVersions.length - 1];
      optimizedResumeText = latestTailored.optimizedText;
    }

    // Generate interview questions using optimized resume text if available
    const questions = await aiService.generateInterviewQuestions(
      resume.parsedData,
      finalJobDescription,
      interviewType,
      settings?.questionCount || 10,
      optimizedResumeText
    );

    // Create interview session
    const interview = new Interview({
      user: req.user._id,
      resume: finalResumeId,
      jobDescription: finalJobDescription,
      interviewType,
      questions,
      settings: {
        questionCount: questions.length,
        timeLimit: settings?.timeLimit || 30,
        allowReplay: settings?.allowReplay !== false,
        showTimer: settings?.showTimer !== false
      },
      session: {
        totalQuestions: questions.length,
        completedQuestions: 0
      }
    });

    await interview.save();

    // Mark interview stage in pipeline (tailoring pipeline progresses to interview)
    try {
      await Pipeline.findOneAndUpdate(
        { user: req.user._id, resume: finalResumeId, type: 'tailoring' },
        { $set: { 'stages.interview': true } },
        { new: true }
      );
    } catch (e) {
      console.warn('Failed to update pipeline stage interview:', e?.message || e);
    }

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      data: {
        interview: interview.getSummary(),
        questions: questions.map(q => ({
          id: q._id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty
        }))
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/interviews
// @desc    Get user's interview sessions
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { status, type, limit = 10, page = 1 } = req.query;

  const query = { user: req.user._id };
  if (status) query.status = status;
  if (type) query.interviewType = type;

  const interviews = await Interview.find(query)
    .populate('resume', 'originalFile.originalName')
    .sort({ 'metadata.createdAt': -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('interviewType status session performance metadata');

  const total = await Interview.countDocuments(query);

  res.json({
    success: true,
    data: {
      interviews: interviews.map(interview => interview.getSummary()),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// @route   GET /api/interviews/:id
// @desc    Get specific interview details
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate('resume', 'parsedData aiAnalysis');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  res.json({
    success: true,
    data: { interview }
  });
}));

// @route   POST /api/interviews/:id/start
// @desc    Start interview session
// @access  Private
router.post('/:id/start', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'scheduled') {
    return res.status(400).json({
      success: false,
      error: 'Interview can only be started when scheduled'
    });
  }

  try {
    await interview.startSession();

    // Notify connected clients
    io.to(interview._id.toString()).emit('interview-started', {
      interviewId: interview._id,
      startTime: interview.session.startTime
    });

    res.json({
      success: true,
      message: 'Interview session started',
      data: {
        interviewId: interview._id,
        startTime: interview.session.startTime,
        status: interview.status
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/response
// @desc    Submit response to interview question
// @access  Private
router.post('/:id/response', asyncHandler(async (req, res) => {
  const { questionIndex, response, nonVerbalData } = req.body;

  if (questionIndex === undefined || !response) {
    return res.status(400).json({
      success: false,
      error: 'Question index and response are required'
    });
  }

  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      error: 'Interview must be in progress to submit responses'
    });
  }

  if (questionIndex >= interview.questions.length) {
    return res.status(400).json({
      success: false,
      error: 'Invalid question index'
    });
  }

  try {
    const question = interview.questions[questionIndex];
    
    // Evaluate response using AI
    const evaluation = await aiService.evaluateResponse(
      question.question,
      response.text || response,
      question.modelAnswer,
      question.expectedKeywords
    );

    // Analyze non-verbal cues if provided
    let nonVerbalAnalysis = null;
    if (nonVerbalData) {
      nonVerbalAnalysis = await aiService.analyzeNonVerbalCues(nonVerbalData);
    }

    // Add response to interview
    await interview.addQuestionResponse(
      questionIndex,
      response,
      evaluation,
      nonVerbalAnalysis
    );

    // Notify connected clients
    io.to(interview._id.toString()).emit('response-evaluated', {
      interviewId: interview._id,
      questionIndex,
      evaluation,
      nonVerbalAnalysis
    });

    res.json({
      success: true,
      message: 'Response submitted successfully',
      data: {
        evaluation,
        nonVerbalAnalysis,
        questionIndex
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/end
// @desc    End interview session
// @access  Private
router.post('/:id/end', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      error: 'Interview must be in progress to end'
    });
  }

  try {
    // End session
    await interview.endSession();

    // Calculate final performance
    await interview.calculatePerformance();

    // Update user stats
    await req.user.updateStats(
      interview.performance.overallScore,
      interview.session.duration
    );

    // Mark analytics stage complete in pipeline
    try {
      await Pipeline.findOneAndUpdate(
        { user: req.user._id, resume: interview.resume, type: 'tailoring' },
        { $set: { 'stages.analytics': true } },
        { new: true }
      );
    } catch (e) {
      console.warn('Failed to update pipeline stage analytics:', e?.message || e);
    }

    // Notify connected clients
    io.to(interview._id.toString()).emit('interview-completed', {
      interviewId: interview._id,
      performance: interview.performance
    });

    res.json({
      success: true,
      message: 'Interview session completed',
      data: {
        interviewId: interview._id,
        performance: interview.performance,
        duration: interview.session.duration
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/recording
// @desc    Upload interview recording
// @access  Private
router.post('/:id/recording', asyncHandler(async (req, res) => {
  // Accept a transcription text instead of raw audio/video per privacy requirement.
  const { transcriptionText, duration } = req.body;

  if (!transcriptionText || typeof transcriptionText !== 'string') {
    return res.status(400).json({ success: false, error: 'transcriptionText is required and must be text' });
  }

  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' });

  try {
    // Store only transcription text and lightweight metadata
    interview.recording = {
      videoUrl: undefined,
      audioUrl: undefined,
      thumbnailUrl: undefined,
      duration: duration || 0,
      fileSize: 0
    };

    // Also persist latest transcription to the last question if session active
    if (interview.session && interview.session.completedQuestions >= 0) {
      // attach as lastResponseSummary for quick access
      interview.metadata = interview.metadata || {};
      interview.metadata.lastTranscription = transcriptionText.substring(0, 2000);
    }

    await interview.save();

    res.json({ success: true, message: 'Transcription saved (text only)', data: { interviewId: interview._id } });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/tts
// @desc    Generate text-to-speech audio for a given question (returns base64 audio). Does NOT store audio.
// @access  Private
router.post('/:id/tts', asyncHandler(async (req, res) => {
  const { questionIndex, voice = 'default' } = req.body;

  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' });

  if (questionIndex === undefined || !interview.questions[questionIndex]) {
    return res.status(400).json({ success: false, error: 'Valid questionIndex is required' });
  }

  const questionText = interview.questions[questionIndex].question;

  // Use AI service placeholder to generate TTS; aiService may return base64 or null when unavailable
  try {
    const audioBase64 = await aiService.generateTTS(questionText, { voice });
    if (!audioBase64) {
      return res.status(503).json({ success: false, error: 'TTS not available' });
    }
    res.json({ success: true, data: { audioBase64 } });
  } catch (err) {
    console.error('TTS generation failed:', err);
    res.status(500).json({ success: false, error: 'TTS generation failed' });
  }
}));

// @route   GET /api/interviews/:id/questions
// @desc    Get interview questions
// @access  Private
router.get('/:id/questions', asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid interview ID'
    });
  }

  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).select('questions');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  res.json({
    success: true,
    data: {
      questions: interview.questions.map(q => ({
        id: q._id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        expectedKeywords: q.expectedKeywords
      }))
    }
  });
}));

// @route   GET /api/interviews/:id/progress
// @desc    Get interview progress
// @access  Private
router.get('/:id/progress', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).select('session status questions');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  const progress = {
    status: interview.status,
    currentQuestion: interview.session.completedQuestions,
    totalQuestions: interview.session.totalQuestions,
    progress: Math.round((interview.session.completedQuestions / interview.session.totalQuestions) * 100),
    startTime: interview.session.startTime,
    duration: interview.session.duration
  };

  res.json({
    success: true,
    data: { progress }
  });
}));

// @route   POST /api/interviews/:id/next-question
// @desc    Generate next interview question based on user response
// @access  Private
router.post('/:id/next-question', asyncHandler(async (req, res) => {
  const { userResponse, conversationHistory, interviewType } = req.body;

  if (!userResponse || !Array.isArray(conversationHistory) || !interviewType) {
    return res.status(400).json({
      success: false,
      error: 'userResponse, conversationHistory (array), and interviewType are required'
    });
  }

  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      error: 'Interview must be in progress to generate next question'
    });
  }

  try {
    const nextQuestion = await aiService.generateNextQuestion(
      interviewType,
      userResponse,
      conversationHistory
    );

    res.json({
      success: true,
      message: 'Next question generated successfully',
      data: {
        question: nextQuestion,
        questionIndex: interview.session.completedQuestions
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/submit
// @desc    Submit interview session transcript and feedback
// @access  Private
router.post('/:id/submit', asyncHandler(async (req, res) => {
  const { transcript, score, strengths, weaknesses, metadata } = req.body;

  if (!transcript || typeof transcript !== 'object' || !Array.isArray(transcript)) {
    return res.status(400).json({
      success: false,
      error: 'Transcript is required and must be an array'
    });
  }

  if (typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({
      success: false,
      error: 'Score is required and must be a number between 0 and 100'
    });
  }

  if (!Array.isArray(strengths) || !Array.isArray(weaknesses)) {
    return res.status(400).json({
      success: false,
      error: 'Strengths and weaknesses must be arrays'
    });
  }

  try {
    const session = new InterviewSession({
      interviewId: req.params.id,
      transcript,
      score,
      strengths,
      weaknesses,
      metadata: metadata || {}
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Interview session submitted successfully',
      data: {
        sessionId: session._id
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   DELETE /api/interviews/:id
// @desc    Delete interview session
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  await Interview.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Interview deleted successfully'
  });
}));

export default router;
