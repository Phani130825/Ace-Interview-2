import express from 'express';
import AIInterviewSession from '../models/AIInterviewSession.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_TTS_MODEL = 'gemini-2.0-flash-tts';

// @route   POST /api/ai-interview/create
// @desc    Create a new AI interview session
// @access  Private
router.post('/create', asyncHandler(async (req, res) => {
  const { role, company, resumeText } = req.body;

  if (!role || !company || !resumeText) {
    return res.status(400).json({
      success: false,
      error: 'Job role, company, and resume text are required'
    });
  }

  // Check for existing active session
  const existingSession = await AIInterviewSession.getActiveSession(req.user._id);
  if (existingSession) {
    return res.json({
      success: true,
      session: existingSession
    });
  }

  // Create new session
  const session = new AIInterviewSession({
    user: req.user._id,
    jobDetails: {
      role,
      company,
      resumeText
    },
    state: 'setup',
    log: []
  });

  await session.save();

  res.json({
    success: true,
    session
  });
}));

// @route   POST /api/ai-interview/:sessionId/start
// @desc    Start the interview and get first question
// @access  Private
router.post('/:sessionId/start', asyncHandler(async (req, res) => {
  const session = await AIInterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  const introPrompt = `Based on the following job details and resume, determine if this is a Technical, Managerial, or HR interview, and then provide a friendly introduction and the first interview question.
    
Job Role: ${session.jobDetails.role}
Company: ${session.jobDetails.company}

Resume:
${session.jobDetails.resumeText}

Your response should start with the interview type, followed by your introduction and the first question.
Example Format:
Interview Type: Technical Review
Hello, and welcome. Let's start with your first question. What is your experience with...`;

  try {
    const apiResponse = await callGeminiTextApi(introPrompt);
    
    const lines = apiResponse.split('\n').filter(line => line.trim() !== '');
    const typeLine = lines.find(line => line.startsWith('Interview Type:'));
    const type = typeLine ? typeLine.replace('Interview Type:', '').trim() : 'General';
    
    const greeting = apiResponse.replace(typeLine || '', '').trim();

    session.interviewType = type;
    session.state = 'in-progress';
    session.metadata.startedAt = new Date();
    session.log.push(
      { speaker: 'System', text: 'Starting interview simulation...', timestamp: Date.now() },
      { speaker: 'Interviewer', text: greeting, timestamp: Date.now() + 100 }
    );

    await session.save();

    res.json({
      success: true,
      session,
      greeting,
      interviewType: type
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview. Please try again.'
    });
  }
}));

// @route   POST /api/ai-interview/:sessionId/answer
// @desc    Submit answer and get feedback + next question
// @access  Private
router.post('/:sessionId/answer', asyncHandler(async (req, res) => {
  const { answer } = req.body;

  if (!answer || answer.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Answer is required'
    });
  }

  const session = await AIInterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  // Add user's answer to log
  session.log.push({
    speaker: 'You',
    text: answer,
    timestamp: Date.now()
  });
  session.metadata.totalAnswers = (session.metadata.totalAnswers || 0) + 1;

  const feedbackPrompt = `You are an AI interviewer providing feedback. The user provided the following answer:
"${answer}"

Based on the previous conversation and their resume, provide a concise evaluation of their answer. Then, provide a suggested enhanced answer and a new question to continue the interview.

Previous Conversation:
${session.log.map(entry => `${entry.speaker}: ${entry.text}`).join('\n')}

Your response should be in the format:
Evaluation: [Your evaluation of the user's answer]
Enhanced Answer: [A better, more detailed answer]
Next Question: [Your next interview question]`;

  try {
    const apiResponse = await callGeminiTextApi(feedbackPrompt);
    const lines = apiResponse.split('\n').filter(line => line.trim() !== '');
    
    const evaluation = lines.find(line => line.startsWith('Evaluation:'))?.replace('Evaluation:', '').trim() || 'No evaluation provided.';
    const enhancedAnswer = lines.find(line => line.startsWith('Enhanced Answer:'))?.replace('Enhanced Answer:', '').trim() || 'No enhanced answer provided.';
    const nextQuestion = lines.find(line => line.startsWith('Next Question:'))?.replace('Next Question:', '').trim() || 'Thank you for your time. The interview is complete.';

    session.log.push(
      { speaker: 'Feedback', text: evaluation, timestamp: Date.now() + 100 },
      { speaker: 'Enhancement', text: `Enhanced Answer: ${enhancedAnswer}`, timestamp: Date.now() + 200 },
      { speaker: 'Interviewer', text: nextQuestion, timestamp: Date.now() + 300 }
    );
    session.metadata.totalQuestions = (session.metadata.totalQuestions || 0) + 1;

    if (nextQuestion.includes('interview is complete')) {
      session.state = 'feedback';
      session.metadata.completedAt = new Date();
      if (session.metadata.startedAt) {
        session.metadata.duration = Math.floor(
          (session.metadata.completedAt - session.metadata.startedAt) / 1000
        );
      }
    }

    await session.save();

    res.json({
      success: true,
      session,
      evaluation,
      enhancedAnswer,
      nextQuestion,
      isComplete: nextQuestion.includes('interview is complete')
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback. Please try again.'
    });
  }
}));

// @route   GET /api/ai-interview/:sessionId
// @desc    Get current session state
// @access  Private
router.get('/:sessionId', asyncHandler(async (req, res) => {
  const session = await AIInterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session
  });
}));

// @route   GET /api/ai-interview/active
// @desc    Get active session for current user
// @access  Private
router.get('/active/current', asyncHandler(async (req, res) => {
  const session = await AIInterviewSession.getActiveSession(req.user._id);

  res.json({
    success: true,
    session
  });
}));

// @route   GET /api/ai-interview/history
// @desc    Get interview history
// @access  Private
router.get('/history/all', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const sessions = await AIInterviewSession.getRecentSessions(req.user._id, limit);

  res.json({
    success: true,
    sessions
  });
}));

// @route   POST /api/ai-interview/:sessionId/reset
// @desc    Reset/end current session
// @access  Private
router.post('/:sessionId/reset', asyncHandler(async (req, res) => {
  const session = await AIInterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  session.state = 'completed';
  session.metadata.completedAt = new Date();
  if (session.metadata.startedAt) {
    session.metadata.duration = Math.floor(
      (session.metadata.completedAt - session.metadata.startedAt) / 1000
    );
  }

  await session.save();

  res.json({
    success: true,
    message: 'Session completed'
  });
}));

// @route   POST /api/ai-interview/tts
// @desc    Convert text to speech using Gemini TTS
// @access  Private
router.post('/tts/generate', asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required'
    });
  }

  try {
    const audioData = await callGeminiTTSApi(text);
    
    res.json({
      success: true,
      audioData: audioData.data,
      mimeType: audioData.mimeType
    });
  } catch (error) {
    console.error('TTS API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech'
    });
  }
}));

// Helper function to call Gemini text generation API
async function callGeminiTextApi(prompt) {
  const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
  const payload = { contents: chatHistory };
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API Error: ${response.status} - ${response.statusText}`, errorText);
    throw new Error('Gemini API returned a non-OK status');
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';
  
  return text;
}

// Helper function to call Gemini TTS API
async function callGeminiTTSApi(text) {
  const payload = {
    contents: [{
      parts: [{ text: text }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
      }
    }
  };
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`TTS API failed with status: ${response.status}`);
  }

  const result = await response.json();
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;

  if (!audioData || !mimeType) {
    throw new Error('No valid audio data received from TTS API');
  }

  return { data: audioData, mimeType };
}

export default router;
