import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import OpenAI from 'openai';

const router = express.Router();

// OpenAI API configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

// @route   POST /api/aptitude/generate-questions
// @desc    Generate aptitude questions using OpenAI API
// @access  Private
router.post('/generate-questions', asyncHandler(async (req, res) => {
  try {
    const userPrompt = "Generate 25 unique multiple-choice questions for a general aptitude test. Each question should be a logical, mathematical, or reasoning problem. Each question object must contain a 'question' (string), an 'options' array (array of 4 strings), and a 'correctAnswer' (string) that is one of the options. Ensure the correct answer is accurately represented within the options. The questions should be diverse and cover topics such as logical reasoning, pattern recognition, quantitative aptitude, and problem-solving. Return the response as a JSON object with a key 'questions' containing the array of questions.";

    const systemMessage = "You are a specialized AI designed to create educational quiz questions. Your task is to generate 25 multiple-choice questions formatted as a JSON object with a key 'questions' containing an array of question objects. Each question must have a question text, four options, and a single correct answer.";

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Invalid response format from the API.");
    }

    const result = JSON.parse(content);
    const questions = result.questions || result;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions were generated.");
    }

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Aptitude question generation error:', error);

    if (error.message.includes('403') || error.message.includes('authentication') || error.message.includes('api key')) {
      return res.status(403).json({
        success: false,
        error: 'API authentication failed. Please check your API key configuration.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate aptitude questions. Please try again.'
    });
  }
}));

export default router;
