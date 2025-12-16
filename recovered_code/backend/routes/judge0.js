import express from 'express';
import axios from 'axios';

const router = express.Router();

// Judge0 API configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_API_HOST = 'judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

/**
 * POST /api/judge0/submit
 * Submit code to Judge0 for execution
 */
router.post('/submit', async (req, res) => {
  try {
    const { source_code, language_id, stdin, cpu_time_limit, memory_limit } = req.body;

    if (!JUDGE0_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Judge0 API key is not configured on the server',
      });
    }

    // Validate required fields
    if (!source_code || !language_id) {
      return res.status(400).json({
        success: false,
        error: 'source_code and language_id are required',
      });
    }

    // Make request to Judge0 API
    const response = await axios.post(
      `${JUDGE0_API_URL}?base64_encoded=false&wait=true`,
      {
        source_code,
        language_id,
        stdin: stdin || '',
        cpu_time_limit: cpu_time_limit || 5,
        memory_limit: memory_limit || 128000,
      },
      {
        headers: {
          'X-RapidAPI-Host': JUDGE0_API_HOST,
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    // Return the Judge0 response
    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Judge0 API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data.message || 'Judge0 API request failed',
        details: error.response.data,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to execute code',
      details: error.message,
    });
  }
});

export default router;
