import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';

// @route   POST /api/coding/generate-question
// @desc    Generate coding question using Gemini API
// @access  Private
router.post('/generate-question', asyncHandler(async (req, res) => {
  try {
    const systemPrompt = `You are a coding problem generator. Generate a problem with the following JSON schema.

CRITICAL REQUIREMENTS FOR BOILERPLATE CODE:
1. Generate partially COMPLETE(boiler template function signature + driver code), RUNNABLE code for each language that works on Judge0 online IDE.
2. Include ALL necessary imports, class definitions, and driver code.
3. Leave ONLY the core algorithm/logic function empty with a TODO comment.
4. The empty function should have the correct signature and parameter names.
5. All input parsing, function calls, and output printing should be fully implemented.
6. The user should only need to fill in ONE function body.
7. The code must be self-contained and runnable without external dependencies.
8. The core function must be clearly marked with a TODO comment and no implementation.
9. Do NOT include any solution code inside the core function.
10. Provide an example of the expected empty function with TODO comment for each language.

LANGUAGE-SPECIFIC REQUIREMENTS:

PYTHON:
- Include complete main execution block with if __name__ == "__main__".
- Parse all inputs from stdin using input().strip() or sys.stdin.read().
- Call the solution function with parsed arguments.
- Print the result directly.
- Leave only the core logic function empty with TODO comment and hints.
- Example structure:
  def solution_function(params):
      # TODO: Implement the core algorithm here
      pass

  if __name__ == "__main__":
      # Input parsing code
      # Function call and print

JAVASCRIPT (Node.js):
- Use process.stdin for input handling.
- Include complete input parsing and output logic.
- Leave only the main function empty with TODO comment.
- Example structure:
  function solutionFunction(params) {
      // TODO: Implement here
  }

  // Complete input reading, parsing, function call, and console.log

JAVA:
- Include complete class structure with main method.
- Use Scanner for input parsing from System.in.
- Include all necessary imports (java.util.Scanner).
- Leave only the solution method in Solution class empty.
- Handle all input parsing and method calls in main().
- CRITICAL: Ensure the code is SYNTAX-COMPLETE with all opening and closing braces, parentheses, and semicolons.
- The generated code MUST compile without syntax errors when the TODO method is empty.
- Example structure:
  import java.util.Scanner;

  public class Solution {
      public static ReturnType solutionMethod(params) {
          // TODO: Implement here
      }

      public static void main(String[] args) {
          Scanner sc = new Scanner(System.in);
          // Input parsing
          // Function call and System.out.println
      }
  }

C++:
- Include all necessary headers (#include <iostream>, <vector>, etc.).
- Complete main() function with input/output handling using cin/cout.
- Leave only the solution function empty.
- Use appropriate input methods (cin, getline, etc.).
- Example structure:
  #include <iostream>
  #include <vector>
  // other includes

  ReturnType solutionFunction(params) {
      // TODO: Implement here
  }

  int main() {
      // Input parsing with cin
      // Function call and cout
      return 0;
  }

Ensure the boilerplate is complete and runnable on Judge0 - users should only implement the core function logic.`;

    const userQuery = `Generate a coding problem for a medium difficulty challenge. The problem should have:
1. Clear description with examples
2. Proper input/output formats and constraints
3. 3 sample test cases and 5 hidden test cases
4. COMPLETE boilerplate code for all languages

For the boilerplate code:
- Generate FULL, COMPLETE, RUNNABLE code
- Include ALL imports, input parsing, main/driver code
- Leave ONLY ONE core function empty with TODO comments and hints
- User should only fill in the algorithm logic, nothing else
- Test cases should work immediately after user implements the core function

Example of what the Python boilerplate should look like:
\`\`\`python
def solution_function(param1, param2):
    # TODO: Implement the core algorithm here
    # Hint: [specific hint about the approach]
    # Your code here
    pass

if __name__ == "__main__":
    # Complete input parsing
    line1 = input().strip()
    line2 = input().strip()
    # Parse inputs appropriately
    param1 = int(line1)
    param2 = list(map(int, line2.split()))

    # Call solution and print result
    result = solution_function(param1, param2)
    print(result)
\`\`\`

Make the boilerplate similarly complete for all other languages.`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            functionName: { type: "STRING" },
            description: { type: "STRING" },
            inputFormat: { type: "STRING" },
            outputFormat: { type: "STRING" },
            constraints: { type: "STRING" },
            boilerplateCode: {
              type: "OBJECT",
              properties: {
                javascript: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                python: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                java: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core method in Solution class empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                cpp: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
              },
            },
            sampleTestCases: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  input: { type: "STRING" },
                  output: { type: "STRING" },
                },
              },
            },
            hiddenTestCases: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  input: { type: "STRING" },
                  output: { type: "STRING" },
                },
              },
            },
          },
        },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${response.status} - ${response.statusText}`, errorText);

      if (response.status === 403) {
        return res.status(403).json({
          success: false,
          error: 'API authentication failed. Please check your API key configuration.'
        });
      }

      throw new Error('Gemini API returned a non-OK status');
    }

    const result = await response.json();
    const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error(
        "Invalid response from Gemini API. No text content found."
      );
    }

    const generatedQuestion = JSON.parse(textContent);

    res.json({
      success: true,
      question: generatedQuestion
    });

  } catch (error) {
    console.error('Coding question generation error:', error);

    if (error.message.includes('403') || error.message.includes('authentication')) {
      return res.status(403).json({
        success: false,
        error: 'API authentication failed. Please check your API key configuration.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate coding question. Please try again.'
    });
  }
}));

export default router;
