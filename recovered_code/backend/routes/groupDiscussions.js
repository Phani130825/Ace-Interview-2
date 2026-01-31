/**
 * Group Discussion Routes - Phase 3
 * WebSocket and REST endpoints for multi-agent group discussions
 */

import express from 'express';
import GroupDiscussionAgentService from '../services/groupDiscussionAgent.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import GroupDiscussionSession from '../models/GroupDiscussionSession.js';

const router = express.Router();
const discussionSessions = new Map(); // In-memory session storage

/**
 * @route   POST /api/discussions/initialize
 * @desc    Initialize a new group discussion session
 * @access  Private
 */
router.post('/initialize', asyncHandler(async (req, res) => {
  const { topic, selectedAgents = null, context = {} } = req.body;

  if (!topic || topic.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Topic is required'
    });
  }

  try {
    const agentService = new GroupDiscussionAgentService();
    
    // Initialize discussion
    const initResult = await agentService.initializeDiscussion(
      topic,
      selectedAgents,
      context
    );

    // Store session
    discussionSessions.set(initResult.sessionId, {
      agentService,
      userId: req.user.id,
      topic,
      createdAt: new Date(),
      messages: [initResult.openingStatement]
    });

    // Save to database
    const session = new GroupDiscussionSession({
      userId: req.user.id,
      topic,
      selectedAgents: Array.isArray(initResult.selectedAgents) 
        ? initResult.selectedAgents 
        : [initResult.selectedAgents],
      context,
      status: 'active',
      messages: [{
        agent: 'facilitator',
        name: 'Alex (Facilitator)',
        message: initResult.openingStatement,
        timestamp: new Date()
      }]
    });

    await session.save();

    res.json({
      success: true,
      sessionId: initResult.sessionId,
      databaseSessionId: session._id,
      topic: initResult.topic,
      selectedAgents: initResult.selectedAgents,
      openingStatement: initResult.openingStatement
    });
  } catch (error) {
    console.error('Error initializing discussion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/discussions/:sessionId/message
 * @desc    Add user message to discussion and get agent responses
 * @access  Private
 */
router.post('/:sessionId/message', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { message, focusAgent = null } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  const session = discussionSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discussion session not found'
    });
  }

  try {
    const result = await session.agentService.processUserInput(message, focusAgent);

    // Update database
    await GroupDiscussionSession.findByIdAndUpdate(
      session.databaseSessionId || req.body.databaseSessionId,
      {
        $push: {
          messages: {
            $each: [
              {
                agent: 'user',
                message: message,
                timestamp: new Date()
              },
              ...result.agentResponses.map(resp => ({
                agent: resp.agent,
                name: resp.name,
                message: resp.message,
                timestamp: new Date()
              }))
            ]
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      userMessage: message,
      agentResponses: result.agentResponses,
      progress: result.discussionProgress
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/discussions/:sessionId/ask-agent
 * @desc    Ask a specific agent a direct question
 * @access  Private
 */
router.post('/:sessionId/ask-agent', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { agentType, question } = req.body;

  if (!agentType || !question) {
    return res.status(400).json({
      success: false,
      error: 'Agent type and question are required'
    });
  }

  const session = discussionSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discussion session not found'
    });
  }

  try {
    const response = await session.agentService.askSpecificAgent(agentType, question);

    res.json({
      success: true,
      agent: response.agent,
      response: response.message
    });
  } catch (error) {
    console.error('Error asking agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/discussions/:sessionId/consensus
 * @desc    Analyze consensus/disagreements in discussion
 * @access  Private
 */
router.get('/:sessionId/consensus', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = discussionSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discussion session not found'
    });
  }

  try {
    const analysis = await session.agentService.analyzeConsensus();

    res.json({
      success: true,
      analysis: analysis.analysis
    });
  } catch (error) {
    console.error('Error analyzing consensus:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/discussions/:sessionId/summary
 * @desc    Get discussion summary
 * @access  Private
 */
router.get('/:sessionId/summary', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = discussionSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discussion session not found'
    });
  }

  try {
    const summary = await session.agentService.generateSummary();

    res.json({
      success: true,
      summary: summary.summary,
      metrics: summary.discussionMetadata
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/discussions/:sessionId/end
 * @desc    End discussion session and get final report
 * @access  Private
 */
router.post('/:sessionId/end', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = discussionSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discussion session not found'
    });
  }

  try {
    const finalReport = await session.agentService.endDiscussion();

    // Update database with final status
    await GroupDiscussionSession.findByIdAndUpdate(
      session.databaseSessionId,
      {
        status: 'completed',
        summary: finalReport.discussionSummary,
        consensusAnalysis: finalReport.consensusAnalysis,
        finalMetrics: finalReport.finalMetrics
      },
      { new: true }
    );

    // Clean up session
    discussionSessions.delete(sessionId);

    res.json({
      success: true,
      finalReport
    });
  } catch (error) {
    console.error('Error ending discussion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/discussions/agents/available
 * @desc    Get list of available agent personalities
 * @access  Private
 */
router.get('/agents/available', (req, res) => {
  try {
    const agents = GroupDiscussionAgentService.getAvailableAgents();
    res.json({
      success: true,
      agents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/discussions/history/:discussionId
 * @desc    Get discussion history from database
 * @access  Private
 */
router.get('/history/:discussionId', asyncHandler(async (req, res) => {
  const { discussionId } = req.params;

  try {
    const discussion = await GroupDiscussionSession.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({
        success: false,
        error: 'Discussion not found'
      });
    }

    res.json({
      success: true,
      discussion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/discussions/user/all
 * @desc    Get all discussions for current user
 * @access  Private
 */
router.get('/user/all', asyncHandler(async (req, res) => {
  try {
    const discussions = await GroupDiscussionSession.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      discussions,
      count: discussions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

export default router;
