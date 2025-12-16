import express from 'express';
import fetch from 'node-fetch';
import { asyncHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';

const router = express.Router();

// Gemini API configuration
const APP_GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

/**
 * Get the appropriate API key for the user
 * Priority: User's API key > App's API key
 */
const getGeminiApiKey = async (userId) => {
  try {
    const user = await User.findById(userId).select('+apiKeys.gemini');
    if (user?.apiKeys?.gemini) {
      return user.apiKeys.gemini;
    }
  } catch (error) {
    console.error('Error fetching user API key:', error);
  }
  return APP_GEMINI_API_KEY;
};

/**
 * Clean Gemini JSON response
 */
function cleanGeminiJSON(text) {
  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

// @route   POST /api/gemini/generate
// @desc    Proxy for Gemini content generation
// @access  Private
router.post('/generate', asyncHandler(async (req, res) => {
  const { prompt, model = 'gemini-2.5-flash', maxOutputTokens = 8192, temperature = 0.7 } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required'
    });
  }

  const apiKey = await getGeminiApiKey(req.user._id);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Gemini API key not configured. Please contact administrator or add your own API key in Settings.'
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return res.status(response.status).json({
        success: false,
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Gemini API call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      details: error.message
    });
  }
}));

// @route   POST /api/gemini/generate-json
// @desc    Proxy for Gemini JSON generation with cleaning
// @access  Private
router.post('/generate-json', asyncHandler(async (req, res) => {
  const { prompt, model = 'gemini-2.5-flash', maxOutputTokens = 8192, temperature = 0.7 } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required'
    });
  }

  const apiKey = await getGeminiApiKey(req.user._id);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Gemini API key not configured. Please contact administrator or add your own API key in Settings.'
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return res.status(response.status).json({
        success: false,
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // Extract text from response
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      return res.status(500).json({
        success: false,
        error: 'Empty response from Gemini'
      });
    }

    // Clean and parse JSON
    try {
      const cleanedText = cleanGeminiJSON(rawText);
      const parsedData = JSON.parse(cleanedText);

      res.json({
        success: true,
        data: parsedData,
        rawText: rawText,
        finishReason: data.candidates?.[0]?.finishReason
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      res.json({
        success: false,
        error: 'Failed to parse JSON response',
        rawText: rawText,
        parseError: parseError.message
      });
    }
  } catch (error) {
    console.error('Gemini API call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      details: error.message
    });
  }
}));

// @route   POST /api/gemini/tts
// @desc    Proxy for Gemini Text-to-Speech
// @access  Private
router.post('/tts', asyncHandler(async (req, res) => {
  const { text, model = 'gemini-2.0-flash-tts' } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required'
    });
  }

  const apiKey = await getGeminiApiKey(req.user._id);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Gemini API key not configured'
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: text }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini TTS API error ${response.status}:`, errorText);
      return res.status(response.status).json({
        success: false,
        error: `Gemini TTS API error: ${response.status}`
      });
    }

    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      return res.status(500).json({
        success: false,
        error: 'No audio data in response'
      });
    }

    res.json({
      success: true,
      data: {
        audio: audioData
      }
    });
  } catch (error) {
    console.error('Gemini TTS API call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech',
      details: error.message
    });
  }
}));

export default router;
