import express from "express";
import fetch from "node-fetch";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

/* ============================
   GEMINI CONFIG
============================ */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not defined in environment variables");
  console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('GEMINI')));
}

/* ============================
   SAFE JSON CLEANER
============================ */
function cleanGeminiJSON(text) {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  
  // Find the first [ and last ] to extract just the JSON array
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned;
}

/* ============================
   REPAIR INCOMPLETE JSON
============================ */
function repairIncompleteJSON(text) {
  try {
    // Try parsing as-is first
    return JSON.parse(text);
  } catch (e) {
    // If it fails, try to repair truncated JSON
    let repaired = text.trim();
    
    // Count opening and closing brackets/braces
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    
    // If we have an incomplete object at the end, remove it
    if (openBraces > closeBraces) {
      const lastCompleteObject = repaired.lastIndexOf('},');
      if (lastCompleteObject !== -1) {
        repaired = repaired.substring(0, lastCompleteObject + 1);
      }
    }
    
    // Close any unclosed braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
    // Close any unclosed brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    // Try parsing again
    return JSON.parse(repaired);
  }
}

/* ============================
   STABLE MODEL (MATCH FRONTEND)
============================ */
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/* ============================
   POST /api/aptitude/generate-questions
============================ */
router.post(
  "/generate-questions",
  asyncHandler(async (req, res) => {
    try {
      const prompt = `
Generate exactly 25 aptitude multiple-choice questions covering various topics (math, logic, reasoning, data interpretation).

Return ONLY valid JSON in this exact format with NO additional text:
[
  {
    "question": "string",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correctAnswer": "A. option1"
  }
]

CRITICAL RULES:
- Output ONLY the JSON array, nothing else
- Exactly 4 options per question
- correctAnswer must EXACTLY match one option including the letter prefix
- Use consistent option format: "A. ", "B. ", "C. ", "D. "
- Complete all 25 questions
- No explanations, no markdown, no code blocks
`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        },
      };

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
      }

      const result = await response.json();

      const rawText =
        result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response from Gemini");
      }

      const cleanedText = cleanGeminiJSON(rawText);

      let questions;
      try {
        questions = repairIncompleteJSON(cleanedText);
      } catch (parseError) {
        console.error("=== JSON PARSE ERROR ===");
        console.error("Parse error:", parseError.message);
        console.error("Cleaned text (first 500 chars):", cleanedText.substring(0, 500));
        console.error("Cleaned text (last 500 chars):", cleanedText.substring(Math.max(0, cleanedText.length - 500)));
        console.error("Raw text length:", rawText.length);
        throw new Error("Gemini returned invalid JSON");
      }

      /* ============================
         VALIDATE STRUCTURE
      ============================ */
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      // Accept 15-25 questions (in case of truncation)
      if (questions.length < 15) {
        throw new Error(`Only ${questions.length} questions generated, need at least 15`);
      }

      // Pad to 25 if we got fewer (rare case)
      if (questions.length < 25) {
        console.warn(`Only ${questions.length} questions generated, expected 25`);
      }

      // Validate and filter out malformed questions
      const validQuestions = questions.filter((q, index) => {
        if (
          typeof q.question !== "string" ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          !q.correctAnswer
        ) {
          console.warn(`Question ${index + 1} is malformed, skipping`);
          return false;
        }

        // Check if correctAnswer matches one of the options (flexible matching)
        const answerMatches = q.options.some(opt => 
          opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
          opt.trim().toLowerCase().includes(q.correctAnswer.trim().toLowerCase()) ||
          q.correctAnswer.trim().toLowerCase().includes(opt.trim().toLowerCase())
        );

        if (!answerMatches) {
          console.warn(`Question ${index + 1} has mismatched answer, attempting to fix`);
          // Try to fix common issues
          const letter = q.correctAnswer.charAt(0).toUpperCase();
          const matchingOption = q.options.find(opt => opt.trim().charAt(0).toUpperCase() === letter);
          if (matchingOption) {
            q.correctAnswer = matchingOption;
            return true;
          }
          return false;
        }

        return true;
      });

      if (validQuestions.length < 15) {
        throw new Error(`Only ${validQuestions.length} valid questions after filtering`);
      }

      res.json({
        success: true,
        questions: validQuestions.slice(0, 25), // Return max 25 questions
        totalGenerated: questions.length,
        validCount: validQuestions.length,
      });
    } catch (error) {
      console.error("Aptitude question generation error:", error.message);
      console.error("Error stack:", error.stack);

      res.status(500).json({
        success: false,
        error: "Failed to generate aptitude questions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  })
);

export default router;