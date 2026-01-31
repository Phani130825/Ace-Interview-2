/**
 * AI Agents Routes - Phase 1 & Phase 2
 * Phase 1: Interviewer Agent, Coding Evaluator Agent, and HR Behavior Agent
 * Phase 2: Mentor Agent, Company Simulation Agent, and Autonomous Task Agent
 */

import express from 'express';
import interviewerAgent from '../services/interviewerAgent.js';
import codingEvaluatorAgent from '../services/codingEvaluatorAgent.js';
import hrBehaviorAgent from '../services/hrBehaviorAgent.js';
import mentorAgent from '../services/mentorAgent.js';
import companySimulationAgent from '../services/companySimulationAgent.js';
import autonomousTaskAgent from '../services/autonomousTaskAgent.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import AIInterviewSession from '../models/AIInterviewSession.js';
import PlacementSimulation from '../models/PlacementSimulation.js';
import Pipeline from '../models/Pipeline.js';

const router = express.Router();

/**
 * ============================================
 * INTERVIEWER AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/interviewer/evaluate-response
 * @desc    Evaluate an interview response and determine adaptive difficulty
 * @access  Private
 */
router.post(
  '/interviewer/evaluate-response',
  asyncHandler(async (req, res) => {
    const { question, answer, interviewType = 'technical' } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Question and answer are required'
      });
    }

    const evaluation = await interviewerAgent.evaluateResponse(
      question,
      answer,
      interviewType
    );

    if (!evaluation.success) {
      return res.status(500).json(evaluation);
    }

    res.json({
      success: true,
      data: evaluation.data
    });
  })
);

/**
 * @route   POST /api/agents/interviewer/next-question
 * @desc    Generate next interview question with adaptive difficulty
 * @access  Private
 */
router.post(
  '/interviewer/next-question',
  asyncHandler(async (req, res) => {
    const {
      interviewType = 'technical',
      difficulty = 'medium',
      topics = [],
      previousTopics = []
    } = req.body;

    const question = await interviewerAgent.generateNextQuestion(
      interviewType,
      difficulty,
      topics,
      previousTopics
    );

    if (!question.success) {
      return res.status(500).json(question);
    }

    res.json({
      success: true,
      data: question.data
    });
  })
);

/**
 * @route   POST /api/agents/interviewer/feedback
 * @desc    Generate comprehensive interview feedback
 * @access  Private
 */
router.post(
  '/interviewer/feedback',
  asyncHandler(async (req, res) => {
    const {
      interviewType = 'technical',
      questionsWithAnswers = [],
      overallScore = 0
    } = req.body;

    const feedback = await interviewerAgent.generateComprehensiveFeedback(
      interviewType,
      questionsWithAnswers,
      overallScore
    );

    if (!feedback.success) {
      return res.status(500).json(feedback);
    }

    res.json({
      success: true,
      data: feedback.data
    });
  })
);

/**
 * @route   POST /api/agents/interviewer/extract-topics
 * @desc    Extract topics from interview responses
 * @access  Private
 */
router.post(
  '/interviewer/extract-topics',
  asyncHandler(async (req, res) => {
    const { responses = [], interviewType = 'technical' } = req.body;

    if (responses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one response is required'
      });
    }

    const topics = await interviewerAgent.extractTopicsFromResponse(
      responses,
      interviewType
    );

    if (!topics.success) {
      return res.status(500).json(topics);
    }

    res.json({
      success: true,
      data: topics.data
    });
  })
);

/**
 * ============================================
 * CODING EVALUATOR AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/coding/analyze
 * @desc    Comprehensive code analysis
 * @access  Private
 */
router.post(
  '/coding/analyze',
  asyncHandler(async (req, res) => {
    const { code = '', language = 'python', problemStatement = '' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }

    const analysis = await codingEvaluatorAgent.analyzeCode(
      code,
      language,
      problemStatement
    );

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    // Calculate score
    const score = codingEvaluatorAgent.calculateCodingScore(analysis.data);

    res.json({
      success: true,
      data: {
        ...analysis.data,
        finalScore: score
      }
    });
  })
);

/**
 * @route   POST /api/agents/coding/detect-weak-topics
 * @desc    Detect weak topics from code submissions
 * @access  Private
 */
router.post(
  '/coding/detect-weak-topics',
  asyncHandler(async (req, res) => {
    const { codeAnalyses = [] } = req.body;

    if (codeAnalyses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one code analysis is required'
      });
    }

    const weakTopics = await codingEvaluatorAgent.detectWeakTopics(codeAnalyses);

    if (!weakTopics.success) {
      return res.status(500).json(weakTopics);
    }

    res.json({
      success: true,
      data: weakTopics.data
    });
  })
);

/**
 * @route   POST /api/agents/coding/generate-problem
 * @desc    Generate coding problem for weak topic
 * @access  Private
 */
router.post(
  '/coding/generate-problem',
  asyncHandler(async (req, res) => {
    const {
      topic = '',
      difficulty = 'medium',
      language = 'python'
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    const problem = await codingEvaluatorAgent.generateProblemFromTopic(
      topic,
      difficulty,
      language
    );

    if (!problem.success) {
      return res.status(500).json(problem);
    }

    res.json({
      success: true,
      data: problem.data
    });
  })
);

/**
 * @route   POST /api/agents/coding/improvement-plan
 * @desc    Generate improvement plan for candidate
 * @access  Private
 */
router.post(
  '/coding/improvement-plan',
  asyncHandler(async (req, res) => {
    const { codeAnalysis = {}, submissionHistory = [] } = req.body;

    const plan = await codingEvaluatorAgent.generateImprovementPlan(
      codeAnalysis,
      submissionHistory
    );

    if (!plan.success) {
      return res.status(500).json(plan);
    }

    res.json({
      success: true,
      data: plan.data
    });
  })
);

/**
 * ============================================
 * HR BEHAVIOR AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/hr/analyze-response
 * @desc    Analyze behavioral HR response
 * @access  Private
 */
router.post(
  '/hr/analyze-response',
  asyncHandler(async (req, res) => {
    const {
      question = '',
      answer = '',
      category = 'general'
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Question and answer are required'
      });
    }

    const analysis = await hrBehaviorAgent.analyzeBehavioralResponse(
      question,
      answer,
      category
    );

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    res.json({
      success: true,
      data: analysis.data
    });
  })
);

/**
 * @route   POST /api/agents/hr/communication-patterns
 * @desc    Analyze communication patterns across responses
 * @access  Private
 */
router.post(
  '/hr/communication-patterns',
  asyncHandler(async (req, res) => {
    const { responses = [] } = req.body;

    if (responses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one response is required'
      });
    }

    const patterns = await hrBehaviorAgent.analyzeCommunicationPatterns(
      responses
    );

    if (!patterns.success) {
      return res.status(500).json(patterns);
    }

    res.json({
      success: true,
      data: patterns.data
    });
  })
);

/**
 * @route   POST /api/agents/hr/feedback
 * @desc    Generate comprehensive HR feedback
 * @access  Private
 */
router.post(
  '/hr/feedback',
  asyncHandler(async (req, res) => {
    const { interviewResponses = [], overallAssessment = {} } = req.body;

    const feedback = await hrBehaviorAgent.generateBehavioralFeedback(
      interviewResponses,
      overallAssessment
    );

    if (!feedback.success) {
      return res.status(500).json(feedback);
    }

    res.json({
      success: true,
      data: feedback.data
    });
  })
);

/**
 * @route   POST /api/agents/hr/detect-red-flags
 * @desc    Detect red flags in responses
 * @access  Private
 */
router.post(
  '/hr/detect-red-flags',
  asyncHandler(async (req, res) => {
    const { responses = [] } = req.body;

    if (responses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one response is required'
      });
    }

    const flags = await hrBehaviorAgent.detectRedFlags(responses);

    if (!flags.success) {
      return res.status(500).json(flags);
    }

    res.json({
      success: true,
      data: flags.data
    });
  })
);

/**
 * @route   POST /api/agents/hr/next-question
 * @desc    Generate next HR question
 * @access  Private
 */
router.post(
  '/hr/next-question',
  asyncHandler(async (req, res) => {
    const { previousTopics = [], focusArea = 'general' } = req.body;

    const question = await hrBehaviorAgent.generateNextQuestion(
      previousTopics,
      focusArea
    );

    if (!question.success) {
      return res.status(500).json(question);
    }

    res.json({
      success: true,
      data: question.data
    });
  })
);

/**
 * ============================================
 * DASHBOARD: Get Agent Recommendations
 * ============================================
 */

/**
 * @route   GET /api/agents/recommendations/:simulationId
 * @desc    Get AI agent recommendations for a simulation
 * @access  Private
 */
router.get(
  '/recommendations/:simulationId',
  asyncHandler(async (req, res) => {
    const simulation = await PlacementSimulation.findById(
      req.params.simulationId
    );

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    const recommendations = {
      interviewer: simulation.performanceMetrics?.agentRecommendations?.interviewerAgent || {},
      coding: simulation.performanceMetrics?.agentRecommendations?.codingEvaluator || {},
      hr: simulation.performanceMetrics?.agentRecommendations?.hrBehavior || {},
      weakTopics: simulation.performanceMetrics?.weakTopics || [],
      strongTopics: simulation.performanceMetrics?.strongTopics || []
    };

    res.json({
      success: true,
      data: recommendations
    });
  })
);

/**
 * ============================================
 * PHASE 2: MENTOR AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/mentor/analyze-placement
 * @desc    Analyze placement simulation data for mentoring insights
 * @access  Private
 */
router.post(
  '/mentor/analyze-placement',
  asyncHandler(async (req, res) => {
    const { placementSimulationId = null, placementData = {} } = req.body;

    let dataToAnalyze = placementData;

    // If simulationId provided, fetch from DB
    if (placementSimulationId) {
      const simulation = await PlacementSimulation.findById(
        placementSimulationId
      );
      if (simulation) {
        dataToAnalyze = simulation.toObject();
      }
    }

    if (!dataToAnalyze || Object.keys(dataToAnalyze).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Placement data is required'
      });
    }

    const analysis = await mentorAgent.analyzePlacementData(dataToAnalyze);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    res.json({
      success: true,
      data: analysis.data
    });
  })
);

/**
 * @route   POST /api/agents/mentor/generate-roadmap
 * @desc    Generate personalized learning roadmap
 * @access  Private
 */
router.post(
  '/mentor/generate-roadmap',
  asyncHandler(async (req, res) => {
    const { performanceAnalysis = {}, targetRole = 'Software Engineer' } = req.body;

    if (!performanceAnalysis || Object.keys(performanceAnalysis).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Performance analysis is required'
      });
    }

    const roadmap = await mentorAgent.generateLearningRoadmap(
      performanceAnalysis,
      targetRole
    );

    if (!roadmap.success) {
      return res.status(500).json(roadmap);
    }

    res.json({
      success: true,
      data: roadmap.data
    });
  })
);

/**
 * @route   POST /api/agents/mentor/recommendations
 * @desc    Generate personalized recommendations
 * @access  Private
 */
router.post(
  '/mentor/recommendations',
  asyncHandler(async (req, res) => {
    const { performanceAnalysis = {}, weaknessAreas = [] } = req.body;

    if (!performanceAnalysis || Object.keys(performanceAnalysis).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Performance analysis is required'
      });
    }

    const recommendations = await mentorAgent.generateRecommendations(
      performanceAnalysis,
      weaknessAreas
    );

    if (!recommendations.success) {
      return res.status(500).json(recommendations);
    }

    res.json({
      success: true,
      data: recommendations.data
    });
  })
);

/**
 * @route   POST /api/agents/mentor/track-progress
 * @desc    Track progress on learning roadmap
 * @access  Private
 */
router.post(
  '/mentor/track-progress',
  asyncHandler(async (req, res) => {
    const { roadmapId = null, completedTasks = [], currentScores = {} } = req.body;

    const progress = await mentorAgent.trackProgress(
      roadmapId,
      completedTasks,
      currentScores
    );

    if (!progress.success) {
      return res.status(500).json(progress);
    }

    res.json({
      success: true,
      data: progress.data
    });
  })
);

/**
 * ============================================
 * PHASE 2: COMPANY SIMULATION AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/company/create-profile
 * @desc    Create company-specific interview profile
 * @access  Private
 */
router.post(
  '/company/create-profile',
  asyncHandler(async (req, res) => {
    const {
      companyName = '',
      industry = '',
      companySize = 'medium',
      jobRole = ''
    } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    const profile = await companySimulationAgent.createCompanyProfile(
      companyName,
      industry,
      companySize,
      jobRole
    );

    if (!profile.success) {
      return res.status(500).json(profile);
    }

    // Save profile to database if Pipeline exists
    const pipeline = new Pipeline({
      user: req.user?._id || null,
      type: 'interview',
      jobDescription: {
        company: companyName,
        title: jobRole
      },
      metadata: { companyProfile: profile.data }
    });

    await pipeline.save();

    res.json({
      success: true,
      data: {
        ...profile.data,
        pipelineId: pipeline._id
      }
    });
  })
);

/**
 * @route   POST /api/agents/company/generate-questions
 * @desc    Generate company-specific technical questions
 * @access  Private
 */
router.post(
  '/company/generate-questions',
  asyncHandler(async (req, res) => {
    const {
      companyProfile = {},
      questionCount = 5,
      difficulty = 'medium'
    } = req.body;

    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Company profile is required'
      });
    }

    const questions = await companySimulationAgent.generateCompanyQuestions(
      companyProfile,
      questionCount,
      difficulty
    );

    if (!questions.success) {
      return res.status(500).json(questions);
    }

    res.json({
      success: true,
      data: questions.data
    });
  })
);

/**
 * @route   POST /api/agents/company/behavioral-questions
 * @desc    Generate company-specific behavioral questions
 * @access  Private
 */
router.post(
  '/company/behavioral-questions',
  asyncHandler(async (req, res) => {
    const { companyProfile = {}, questionCount = 4 } = req.body;

    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Company profile is required'
      });
    }

    const questions = await companySimulationAgent.generateBehavioralQuestions(
      companyProfile,
      questionCount
    );

    if (!questions.success) {
      return res.status(500).json(questions);
    }

    res.json({
      success: true,
      data: questions.data
    });
  })
);

/**
 * @route   POST /api/agents/company/customize-flow
 * @desc    Customize interview flow for specific company
 * @access  Private
 */
router.post(
  '/company/customize-flow',
  asyncHandler(async (req, res) => {
    const { companyProfile = {}, candidateLevel = 'mid-level' } = req.body;

    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Company profile is required'
      });
    }

    const flow = await companySimulationAgent.customizeInterviewFlow(
      companyProfile,
      candidateLevel
    );

    if (!flow.success) {
      return res.status(500).json(flow);
    }

    res.json({
      success: true,
      data: flow.data
    });
  })
);

/**
 * @route   POST /api/agents/company/analyze-fit
 * @desc    Analyze cultural and role fit for company
 * @access  Private
 */
router.post(
  '/company/analyze-fit',
  asyncHandler(async (req, res) => {
    const { companyProfile = {}, candidateResponses = [] } = req.body;

    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Company profile is required'
      });
    }

    const analysis = await companySimulationAgent.analyzeCompanyFit(
      companyProfile,
      candidateResponses
    );

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    res.json({
      success: true,
      data: analysis.data
    });
  })
);

/**
 * ============================================
 * PHASE 2: AUTONOMOUS TASK AGENT ENDPOINTS
 * ============================================
 */

/**
 * @route   POST /api/agents/task/generate-plan
 * @desc    Generate adaptive 8-week task plan
 * @access  Private
 */
router.post(
  '/task/generate-plan',
  asyncHandler(async (req, res) => {
    const {
      userData = {},
      performanceData = {},
      targetGoal = 'placement'
    } = req.body;

    const plan = await autonomousTaskAgent.generateTaskPlan(
      userData,
      performanceData,
      targetGoal
    );

    if (!plan.success) {
      return res.status(500).json(plan);
    }

    res.json({
      success: true,
      data: plan.data
    });
  })
);

/**
 * @route   POST /api/agents/task/schedule-interviews
 * @desc    Schedule interviews with automation
 * @access  Private
 */
router.post(
  '/task/schedule-interviews',
  asyncHandler(async (req, res) => {
    const {
      taskPlan = {},
      startDate = new Date(),
      pipelineId = null
    } = req.body;

    const schedule = await autonomousTaskAgent.scheduleInterviews(
      taskPlan,
      startDate,
      pipelineId
    );

    if (!schedule.success) {
      return res.status(500).json(schedule);
    }

    // Update pipeline with scheduled tasks if pipelineId provided
    if (pipelineId) {
      const pipeline = await Pipeline.findByIdAndUpdate(
        pipelineId,
        {
          'metadata.scheduledTasks': schedule.data,
          'metadata.scheduledJobCount': schedule.scheduledJobCount
        },
        { new: true }
      );
    }

    res.json({
      success: true,
      data: schedule.data,
      scheduledJobCount: schedule.scheduledJobCount
    });
  })
);

/**
 * @route   POST /api/agents/task/adjust-difficulty
 * @desc    Auto-adjust difficulty based on performance
 * @access  Private
 */
router.post(
  '/task/adjust-difficulty',
  asyncHandler(async (req, res) => {
    const {
      currentTaskPlan = {},
      performanceScore = 0,
      metricsData = {}
    } = req.body;

    const adjustment = await autonomousTaskAgent.autoAdjustDifficulty(
      currentTaskPlan,
      performanceScore,
      metricsData
    );

    if (!adjustment.success) {
      return res.status(500).json(adjustment);
    }

    res.json({
      success: true,
      data: adjustment.data
    });
  })
);

/**
 * @route   POST /api/agents/task/track-completion
 * @desc    Track task completion and update metrics
 * @access  Private
 */
router.post(
  '/task/track-completion',
  asyncHandler(async (req, res) => {
    const { taskId = null, completed = true, performanceData = {} } = req.body;

    const tracking = await autonomousTaskAgent.trackTaskCompletion(
      taskId,
      completed,
      performanceData
    );

    if (!tracking.success) {
      return res.status(500).json(tracking);
    }

    res.json({
      success: true,
      data: tracking.data
    });
  })
);

/**
 * @route   POST /api/agents/task/send-notification
 * @desc    Send automated notification
 * @access  Private
 */
router.post(
  '/task/send-notification',
  asyncHandler(async (req, res) => {
    const {
      userId = null,
      notificationType = 'reminder',
      message = ''
    } = req.body;

    const notification = await autonomousTaskAgent.sendNotification(
      userId,
      notificationType,
      message,
      null // emailService would be passed here if available
    );

    if (!notification.success) {
      return res.status(500).json(notification);
    }

    res.json({
      success: true,
      data: notification.data
    });
  })
);

export default router;
