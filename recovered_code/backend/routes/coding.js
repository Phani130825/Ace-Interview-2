import express from "express";
import fetch from "node-fetch";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

/* ============================
   GEMINI CONFIG
============================ */
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

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
  
  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
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
    console.log('Initial parse failed, attempting repair...');
    let repaired = text.trim();
    
    // Handle unterminated strings by finding the last complete string
    if (e.message.includes('Unterminated string')) {
      // Find the last complete quote before truncation
      const lastCompleteQuote = repaired.lastIndexOf('"');
      if (lastCompleteQuote !== -1) {
        // Look for the comma or bracket before this incomplete field
        let truncateAt = repaired.lastIndexOf(',', lastCompleteQuote);
        if (truncateAt === -1) {
          truncateAt = repaired.lastIndexOf('{', lastCompleteQuote);
        }
        if (truncateAt !== -1) {
          repaired = repaired.substring(0, truncateAt);
        }
      }
    }
    
    // Count opening and closing brackets/braces
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    
    // Close any unclosed brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    // Close any unclosed braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
    console.log('Repair attempted, trying parse again...');
    // Try parsing again
    return JSON.parse(repaired);
  }
}

/* ============================
   STABLE MODEL (MATCH APTITUDE)
============================ */
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/* ============================
   POST /api/coding/generate-question
============================ */
router.post(
  "/generate-question",
  asyncHandler(async (req, res) => {
    try {
      const prompt = `Generate a medium difficulty coding problem.

Return ONLY valid JSON (no markdown, no explanations):
{
  "title": "Problem Title",
  "functionName": "functionName",
  "description": "Problem description with 2 examples",
  "inputFormat": "Input format",
  "outputFormat": "Output format",
  "constraints": "Constraints",
  "boilerplateCode": {
    "javascript": {"functionSignature": "Complete runnable Node.js code with TODO in main function", "mainDriver": ""},
    "python": {"functionSignature": "Complete runnable Python code with TODO in main function", "mainDriver": ""},
    "java": {"functionSignature": "Complete runnable Java code with TODO in main method", "mainDriver": ""},
    "cpp": {"functionSignature": "Complete runnable C++ code with TODO in main function", "mainDriver": ""}
  },
  "sampleTestCases": [{"input": "", "output": ""}, {"input": "", "output": ""}, {"input": "", "output": ""}],
  "hiddenTestCases": [{"input": "", "output": ""}, {"input": "", "output": ""}, {"input": "", "output": ""}, {"input": "", "output": ""}, {"input": "", "output": ""}]
}

Boilerplate requirements:
- Include ALL imports, input parsing, and driver code
- Leave ONLY the core algorithm function empty with TODO
- Must be immediately runnable on Judge0 after implementing TODO
- Keep code concise but complete

Examples:

Python:
def solve(params):
    # TODO: Implement
    pass

if __name__ == "__main__":
    line = input().strip()
    result = solve(line)
    print(result)

JavaScript:
const solve = (params) => {
    // TODO: Implement
};

const input = require('fs').readFileSync(0, 'utf-8').trim();
console.log(solve(input));

Java:
import java.util.*;
public class Solution {
    static int solve(String input) {
        // TODO: Implement
        return 0;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String input = sc.nextLine();
        System.out.println(solve(input));
    }
}

C++:
#include <iostream>
#include <string>
using namespace std;

int solve(string input) {
    // TODO: Implement
    return 0;
}

int main() {
    string input;
    getline(cin, input);
    cout << solve(input) << endl;
    return 0;
}

IMPORTANT: Keep description concise, focus on clear problem statement.`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
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

      // Check if response was truncated
      const finishReason = result?.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        console.warn('Response was truncated due to token limit');
      }

      console.log(`Response length: ${rawText.length} chars, finish reason: ${finishReason}`);

      const cleanedText = cleanGeminiJSON(rawText);

      let question;
      try {
        question = repairIncompleteJSON(cleanedText);
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
      if (typeof question !== 'object' || question === null) {
        throw new Error("Response is not an object");
      }

      // Validate required fields
      const requiredFields = [
        'title',
        'functionName',
        'description',
        'inputFormat',
        'outputFormat',
        'constraints',
        'boilerplateCode',
        'sampleTestCases',
        'hiddenTestCases'
      ];

      const missingFields = requiredFields.filter(field => !question[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate boilerplate code structure
      const requiredLanguages = ['javascript', 'python', 'java', 'cpp'];
      const missingLanguages = requiredLanguages.filter(
        lang => !question.boilerplateCode[lang] || 
               !question.boilerplateCode[lang].functionSignature
      );

      if (missingLanguages.length > 0) {
        throw new Error(`Missing boilerplate for languages: ${missingLanguages.join(', ')}`);
      }

      // Validate test cases
      if (!Array.isArray(question.sampleTestCases) || question.sampleTestCases.length < 2) {
        throw new Error("Need at least 2 sample test cases");
      }

      if (!Array.isArray(question.hiddenTestCases) || question.hiddenTestCases.length < 3) {
        throw new Error("Need at least 3 hidden test cases");
      }

      // Validate test case structure
      const allTestCases = [...question.sampleTestCases, ...question.hiddenTestCases];
      const invalidTestCases = allTestCases.filter(
        tc => !tc.input || !tc.output
      );

      if (invalidTestCases.length > 0) {
        console.warn(`${invalidTestCases.length} test cases are missing input/output`);
      }

      res.json({
        success: true,
        question: question,
      });
    } catch (error) {
      console.error("Coding question generation error:", error.message);
      console.error("Error stack:", error.stack);

      res.status(500).json({
        success: false,
        error: "Failed to generate coding question",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  })
);

export default router;