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
    // If it fails, try to repair truncated JSON
    let repaired = text.trim();
    
    // Count opening and closing brackets/braces
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    
    // If we have an incomplete array at the end, try to close it
    if (openBrackets > closeBrackets) {
      const lastComma = repaired.lastIndexOf(',');
      if (lastComma !== -1) {
        // Remove incomplete item after last comma
        repaired = repaired.substring(0, lastComma);
      }
    }
    
    // Close any unclosed brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    // Close any unclosed braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
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
      const prompt = `
Generate a coding problem for a medium difficulty challenge.

Return ONLY valid JSON in this exact format with NO additional text:
{
  "title": "Problem Title",
  "functionName": "functionName",
  "description": "Clear problem description with examples",
  "inputFormat": "Description of input format",
  "outputFormat": "Description of output format",
  "constraints": "List of constraints",
  "boilerplateCode": {
    "javascript": {
      "functionSignature": "Complete Node.js code with only core function empty",
      "mainDriver": ""
    },
    "python": {
      "functionSignature": "Complete Python code with only core function empty",
      "mainDriver": ""
    },
    "java": {
      "functionSignature": "Complete Java code with only core method empty",
      "mainDriver": ""
    },
    "cpp": {
      "functionSignature": "Complete C++ code with only core function empty",
      "mainDriver": ""
    }
  },
  "sampleTestCases": [
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"}
  ],
  "hiddenTestCases": [
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"},
    {"input": "test input", "output": "expected output"}
  ]
}

CRITICAL BOILERPLATE REQUIREMENTS:
1. Generate COMPLETE, RUNNABLE code for each language that works on Judge0
2. Include ALL necessary imports, input parsing, and driver code
3. Leave ONLY the core algorithm function empty with TODO comment
4. User should only fill in ONE function body
5. Code must be self-contained and runnable immediately after user implements core function

PYTHON Example:
def solution_function(params):
    # TODO: Implement the core algorithm here
    pass

if __name__ == "__main__":
    # Complete input parsing
    result = solution_function(parsed_input)
    print(result)

JAVASCRIPT Example:
function solutionFunction(params) {
    // TODO: Implement here
}

// Complete input reading and output
process.stdin.on('data', (data) => {
    const result = solutionFunction(parsed);
    console.log(result);
});

JAVA Example:
import java.util.Scanner;

public class Solution {
    public static ReturnType solutionMethod(params) {
        // TODO: Implement here
        return null;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Complete input parsing
        ReturnType result = solutionMethod(parsed);
        System.out.println(result);
    }
}

C++ Example:
#include <iostream>
using namespace std;

ReturnType solutionFunction(params) {
    // TODO: Implement here
}

int main() {
    // Complete input parsing
    ReturnType result = solutionFunction(parsed);
    cout << result << endl;
    return 0;
}

CRITICAL RULES:
- Output ONLY the JSON object, nothing else
- Exactly 3 sample test cases and 5 hidden test cases
- All boilerplate code must be complete except for the core function
- No explanations, no markdown, no code blocks
- Ensure proper syntax with all braces and parentheses closed
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