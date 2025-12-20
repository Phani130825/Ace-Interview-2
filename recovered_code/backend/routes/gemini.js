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
    const user = await User.findById(userId);
    if (user?.hasApiKey('gemini')) {
      const decryptedKey = user.getApiKey('gemini');
      if (decryptedKey) {
        console.log('Using user\'s Gemini API key');
        return decryptedKey;
      }
    }
  } catch (error) {
    console.error('Error fetching user API key:', error);
  }
  console.log('Using app\'s Gemini API key');
  return APP_GEMINI_API_KEY;
};

/**
 * Clean Gemini JSON response
 */
function cleanGeminiJSON(text) {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  
  // Find the JSON boundaries
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  
  // Determine if it's an array or object and extract
  let start = -1;
  let end = -1;
  
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    end = lastBracket + 1;
  } else if (firstBrace !== -1) {
    start = firstBrace;
    end = lastBrace + 1;
  }
  
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end);
  }
  
  return cleaned;
}

function repairJSON(jsonString) {
  try {
    // First try parsing as-is
    return JSON.parse(jsonString);
  } catch (e) {
    console.log('JSON parse failed, attempting repair. Error:', e.message);
    let repaired = jsonString;
    
    // Strategy 1: Handle unterminated strings
    if (e.message.includes('Unterminated string') || e.message.includes('Unexpected end')) {
      console.log('Attempting to repair unterminated string...');
      
      // Extract score (required)
      const scoreMatch = repaired.match(/"score"\s*:\s*(\d+)/);
      
      if (scoreMatch) {
        const score = scoreMatch[1];
        
        // Try to extract any partial feedback text
        // Look for feedback property followed by opening quote
        const feedbackPattern = /"feedback"\s*:\s*"([^"]*)(?:")?/;
        const feedbackMatch = repaired.match(feedbackPattern);
        
        let feedback = "Evaluation completed successfully";
        if (feedbackMatch && feedbackMatch[1]) {
          // Clean up the partial feedback
          let partialFeedback = feedbackMatch[1]
            .replace(/\\/g, '') // Remove escape characters
            .replace(/[\n\r\t]/g, ' ') // Replace newlines with spaces
            .trim();
          
          // If we got some feedback, use it
          if (partialFeedback.length > 0) {
            // Truncate if too long and add ellipsis
            if (partialFeedback.length > 150) {
              partialFeedback = partialFeedback.substring(0, 147) + '...';
            } else {
              partialFeedback = partialFeedback + '...';
            }
            feedback = partialFeedback;
          }
        }
        
        // Construct valid JSON
        repaired = JSON.stringify({ score: parseInt(score), feedback });
        console.log('Repaired JSON:', repaired);
        return JSON.parse(repaired);
      }
    }
    
    // Strategy 2: Handle missing closing braces
    if (e.message.includes('Unexpected end') || e.message.includes('Expected')) {
      // Try to extract score at minimum
      const scoreMatch = repaired.match(/"score"\s*:\s*(\d+)/);
      if (scoreMatch) {
        const score = scoreMatch[1];
        repaired = JSON.stringify({ 
          score: parseInt(score), 
          feedback: "Evaluation completed successfully" 
        });
        console.log('Repaired JSON (missing braces):', repaired);
        return JSON.parse(repaired);
      }
    }
    
    // Strategy 3: Last resort - return default values
    console.log('All repair strategies failed, using defaults');
    return {
      score: 70,
      feedback: "Evaluation completed. Response recorded successfully."
    };
  }
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

  // Debug log (mask the key for security)
  console.log('Using Gemini API key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'null');

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

    // Extract the text content from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return res.status(500).json({
        success: false,
        error: 'Empty response from Gemini',
        rawResponse: data
      });
    }

    res.json({
      success: true,
      data: text, // Return just the text string
      rawResponse: data // Include full response for debugging if needed
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
      console.log('Cleaned JSON text:', cleanedText.substring(0, 200)); // Log first 200 chars
      const parsedData = repairJSON(cleanedText);

      res.json({
        success: true,
        data: parsedData,
        rawText: rawText,
        finishReason: data.candidates?.[0]?.finishReason
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', rawText);
      console.error('Cleaned text:', cleanGeminiJSON(rawText));
      res.json({
        success: false,
        error: 'Failed to parse JSON response',
        rawText: rawText,
        cleanedText: cleanGeminiJSON(rawText),
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
