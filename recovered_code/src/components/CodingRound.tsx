import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Code,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  ArrowRight,
  Loader,
  ArrowLeft,
} from "lucide-react";
import api from "@/services/api";
import axios from "axios";
import { saveCodingTest } from "@/services/testStorage";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}

// Environment variables - these will be provided in your .env file
const APP_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const languageMap = {
  javascript: { id: 63, name: "JavaScript" },
  python: { id: 71, name: "Python 3" },
  java: { id: 62, name: "Java" },
  cpp: { id: 54, name: "C++" },
};

const statusMap = {
  1: { status: "In Queue", color: "text-gray-400" },
  2: { status: "Processing", color: "text-yellow-400" },
  3: { status: "Accepted", color: "text-green-400" },
  4: { status: "Wrong Answer", color: "text-red-400" },
  5: { status: "Time Limit Exceeded", color: "text-red-400" },
  6: { status: "Compilation Error", color: "text-red-400" },
  7: { status: "Runtime Error", color: "text-red-400" },
  8: { status: "Memory Limit Exceeded", color: "text-red-400" },
  9: { status: "Internal Error", color: "text-red-400" },
  10: { status: "Invalid Request", color: "text-red-400" },
  11: { status: "Blacklisted", color: "text-red-400" },
  12: { status: "Internal Error", color: "text-red-400" },
};

const createRunnableCode = (userCode, mainDriver) => {
  return `${userCode}\n\n${mainDriver}`;
};

type CodingRoundProps = {
  onProceed?: () => void;
};

const App = ({ onProceed }: CodingRoundProps) => {
  const [userId, setUserId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [finalScore, setFinalScore] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [usingUserKey, setUsingUserKey] = useState<boolean>(false);
  const monacoEditorRef = useRef(null);
  const lastGenerationTime = useRef(0);
  const lastApiCallTime = useRef(0);
  const lastSubmissionTime = useRef(0);

  // Load saved code from localStorage for current question and language
  const loadSavedCode = (questionTitle, lang) => {
    if (!questionTitle) return null;
    const key = `code_${questionTitle}_${lang}`;
    return localStorage.getItem(key);
  };

  // Save code to localStorage for current question and language
  const saveCode = (questionTitle, lang, codeToSave) => {
    if (!questionTitle) return;
    const key = `code_${questionTitle}_${lang}`;
    localStorage.setItem(key, codeToSave);
  };

  // Initialize Monaco Editor on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.28.1/min/vs/loader.js";
    script.onload = () => {
      window.require.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.28.1/min/vs",
        },
      });
      window.require(["vs/editor/editor.main"], () => {
        monacoEditorRef.current = window.monaco.editor.create(
          document.getElementById("monaco-editor"),
          {
            value: "",
            language: language,
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
          }
        );

        monacoEditorRef.current.onDidChangeModelContent(() => {
          const currentCode = monacoEditorRef.current.getValue();
          setCode(currentCode);
          if (question && question.title) {
            saveCode(question.title, language, currentCode);
          }
        });
        setIsEditorReady(true);
      });
    };
    document.body.appendChild(script);

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []);

  // Load user's Gemini API key from backend
  useEffect(() => {
    const loadUserApiKey = async () => {
      try {
        const response = await api.get("/users/api-keys/gemini");
        if (response.data.success && response.data.data.apiKey) {
          setUserApiKey(response.data.data.apiKey);
          setUsingUserKey(true);
        }
      } catch (error) {
        console.log("No user API key found, will use application key");
        setUsingUserKey(false);
      }
    };
    loadUserApiKey();
  }, []);

  // Update editor language and content when state changes
  useEffect(() => {
    if (isEditorReady && monacoEditorRef.current && question) {
      const model = monacoEditorRef.current.getModel();
      if (model) {
        window.monaco.editor.setModelLanguage(model, language);
      }
      // Try to load saved code from localStorage
      if (
        question.boilerplateCode &&
        question.boilerplateCode[language] &&
        question.boilerplateCode[language].functionSignature
      ) {
        const savedCode = loadSavedCode(question.title, language);
        if (savedCode !== null) {
          monacoEditorRef.current.setValue(savedCode);
          setCode(savedCode);
        } else {
          const boilerplate =
            question.boilerplateCode[language].functionSignature;
          monacoEditorRef.current.setValue(boilerplate);
          setCode(boilerplate);
        }
      } else {
        // If boilerplateCode or language key is missing, clear editor and code state
        monacoEditorRef.current.setValue("");
        setCode("");
      }
    }
  }, [language, question, isEditorReady]);

  // Initialize user and fetch data from backend
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Generate or get user ID
        let user = localStorage.getItem("userId");
        if (!user) {
          user = "user-" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("userId", user);
        }
        setUserId(user);

        // Fetch submission history from backend
        try {
          const response = await api.get(`/submissions/${user}`);
          setSubmissionHistory(response.data);
        } catch (e) {
          console.error("Error fetching submission history:", e);
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    initializeUser();
  }, []);

  // Function to generate a mock question for testing
  const generateMockQuestion = () => {
    return {
      title: "Mock Coding Problem: Two Sum",
      functionName: "twoSum",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      inputFormat:
        "First line: space-separated integers representing the array nums. Second line: integer target.",
      outputFormat:
        "Two space-separated integers representing the indices of the two numbers.",
      constraints:
        "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9, Only one valid answer exists.",
      boilerplateCode: {
        javascript: {
          functionSignature: `function twoSum(nums, target) {
  // TODO: Implement the two sum algorithm here
  // Hint: Use a hash map to store indices
  // Your code here
}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').split('\\n');
let line = 0;

let nums = input[line++].trim().split(' ').map(Number);
let target = Number(input[line++].trim());

let result = twoSum(nums, target);
console.log(result.join(' '));`,
          mainDriver: "",
        },
        python: {
          functionSignature: `def two_sum(nums, target):
    # TODO: Implement the two sum algorithm here
    # Hint: Use a dictionary to store indices
    # Your code here
    pass

if __name__ == "__main__":
    nums = list(map(int, input().strip().split()))
    target = int(input().strip())
    result = two_sum(nums, target)
    print(' '.join(map(str, result)))`,
          mainDriver: "",
        },
        java: {
          functionSignature: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // TODO: Implement the two sum algorithm here
        // Hint: Use a HashMap to store indices
        // Your code here
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] numsStr = sc.nextLine().trim().split(" ");
        int[] nums = new int[numsStr.length];
        for (int i = 0; i < numsStr.length; i++) {
            nums[i] = Integer.parseInt(numsStr[i]);
        }
        int target = Integer.parseInt(sc.nextLine().trim());
        int[] result = twoSum(nums, target);
        System.out.println(result[0] + " " + result[1]);
    }
}`,
          mainDriver: "",
        },
        cpp: {
          functionSignature: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // TODO: Implement the two sum algorithm here
    // Hint: Use an unordered_map to store indices
    // Your code here
}

int main() {
    vector<int> nums;
    int target;
    string line;
    getline(cin, line);
    stringstream ss(line);
    int num;
    while (ss >> num) {
        nums.push_back(num);
    }
    cin >> target;
    vector<int> result = twoSum(nums, target);
    cout << result[0] << " " << result[1] << endl;
    return 0;
}`,
          mainDriver: "",
        },
      },
      sampleTestCases: [
        { input: "2 7 11 15\n9", output: "0 1" },
        { input: "3 2 4\n6", output: "1 2" },
        { input: "3 3\n6", output: "0 1" },
      ],
      hiddenTestCases: [
        { input: "1 5 3 7\n8", output: "1 2" },
        { input: "0 4 3 0\n0", output: "0 3" },
        { input: "-1 -2 -3 -4 -5\n-8", output: "2 4" },
        { input: "1 2 3 4 5\n9", output: "3 4" },
        { input: "10 20 30 40\n50", output: "0 2" },
      ],
    };
  };

  // Helper function to call Gemini API with user key fallback and rate limiting
  const callGeminiAPI = async (payload: any, retries = 3, delayMs = 5000) => {
    // Implement rate limiting: minimum 3 seconds between API calls
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime.current;
    if (timeSinceLastCall < 3000) {
      const waitTime = 3000 - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastApiCallTime.current = Date.now();

    let lastError: any = null;

    // Try with user's API key first if available
    if (userApiKey) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const userApiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;
          const response = await fetch(userApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            setUsingUserKey(true);
            return await response.json();
          }

          if (response.status === 429) {
            console.warn(
              `User API key rate limited, attempt ${attempt + 1}/${retries}`
            );
            if (attempt < retries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, delayMs * Math.pow(2, attempt))
              );
              continue;
            }
          }

          lastError = new Error(
            `User API key failed with status: ${response.status}`
          );
          console.warn(
            "User API key failed, falling back to app key:",
            lastError.message
          );
          break;
        } catch (error) {
          lastError = error;
          console.warn("User API key error, falling back to app key:", error);
          break;
        }
      }
    }

    // Fall back to application's API key
    setUsingUserKey(false);
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const appApiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${APP_GEMINI_API_KEY}`;
        const response = await fetch(appApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return await response.json();
        }

        if (response.status === 429) {
          console.warn(
            `App API key rate limited, attempt ${attempt + 1}/${retries}`
          );
          if (attempt < retries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, delayMs * Math.pow(2, attempt))
            );
            continue;
          }
        }

        throw new Error(`App API key failed with status: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * Math.pow(2, attempt))
          );
          continue;
        }
      }
    }

    throw lastError || new Error("All API calls failed");
  };

  const handleGenerateQuestion = async () => {
    // Rate limiting: 10 seconds between generations
    const now = Date.now();
    if (now - lastGenerationTime.current < 10000) {
      setApiError("Please wait 10 seconds before generating another question.");
      return;
    }
    lastGenerationTime.current = now;

    setIsLoading(true);
    setQuestion(null);
    setFinalScore(null);
    setTestResults([]);
    setCode("");
    setApiError(null);

    // Clear any existing saved code for the current question before generating a new one
    if (question && question.title) {
      Object.keys(languageMap).forEach((lang) => {
        const key = `code_${question.title}_${lang}`;
        localStorage.removeItem(key);
      });
    }

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

Ensure the boilerplate is complete and runnable on Judge0 - users should only implement the core function logic.

`;

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

Make the boilerplate similarly complete for all other languages.

CRITICAL JSON FORMAT REQUIREMENT:
You MUST respond with ONLY a valid JSON object following this EXACT structure. Do NOT include any markdown formatting, code blocks, or explanatory text.

Required JSON Schema (all fields are MANDATORY):
{
  "title": "string - Problem title",
  "functionName": "string - Name of the function to implement",
  "description": "string - Clear problem description with examples",
  "inputFormat": "string - Description of input format",
  "outputFormat": "string - Description of output format",
  "constraints": "string - Problem constraints",
  "boilerplateCode": {
    "javascript": {
      "functionSignature": "string - Complete Node.js code with only core function empty",
      "mainDriver": "string - Empty string (all code in functionSignature)"
    },
    "python": {
      "functionSignature": "string - Complete Python code with only core function empty",
      "mainDriver": "string - Empty string (all code in functionSignature)"
    },
    "java": {
      "functionSignature": "string - Complete Java code with only core method empty",
      "mainDriver": "string - Empty string (all code in functionSignature)"
    },
    "cpp": {
      "functionSignature": "string - Complete C++ code with only core function empty",
      "mainDriver": "string - Empty string (all code in functionSignature)"
    }
  },
  "sampleTestCases": [
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" }
  ],
  "hiddenTestCases": [
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - NO EXPLANATIONS, NO MARKDOWN, NO CODE BLOCKS.`;

    const combinedPrompt = `${systemPrompt}\n\n${userQuery}`;

    const payload = {
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 32768,
        topP: 0.95,
        topK: 40,
      },
    };

    try {
      let generatedQuestion;

      // First try backend API (which uses Gemini)
      try {
        const backendResponse = await fetch(
          `${BACKEND_URL}/api/coding/generate-question`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (backendResponse.ok) {
          const backendResult = await backendResponse.json();
          if (backendResult.success && backendResult.question) {
            generatedQuestion = backendResult.question;
          } else {
            console.warn(
              "Backend returned success but no question:",
              backendResult
            );
          }
        } else {
          console.warn("Backend response not ok:", backendResponse.status);
        }
      } catch (backendError) {
        console.warn(
          "Backend Gemini failed, falling back to direct Gemini:",
          backendError
        );
      }

      // Fallback to direct Gemini call if backend failed or didn't return a question
      if (!generatedQuestion) {
        console.log(
          "Trying direct Gemini API call with user/app key fallback..."
        );
        const data = await callGeminiAPI(payload);
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const finishReason = data?.candidates?.[0]?.finishReason;

        if (!textContent) {
          throw new Error(
            "Invalid response from Gemini API. No text content found."
          );
        }

        // Check if response was truncated due to token limit
        if (finishReason === "MAX_TOKENS") {
          console.warn("⚠️ Response may be truncated due to token limit");
          throw new Error(
            "Response was truncated. The question may be incomplete. Please try again."
          );
        }

        try {
          // Clean the response to extract JSON
          let jsonText = textContent.trim();

          // Remove markdown code blocks if present
          if (jsonText.startsWith("```json")) {
            jsonText = jsonText
              .replace(/```json\s*/, "")
              .replace(/\s*```$/, "");
          } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/```\s*/, "").replace(/\s*```$/, "");
          }

          generatedQuestion = JSON.parse(jsonText);
        } catch (e) {
          console.error("Failed to parse Gemini response:", e);
          console.error("Raw response:", textContent.substring(0, 500));
          throw new Error(
            "Gemini response was not valid JSON. Please try again."
          );
        }
      }

      // Ensure we have a question
      if (!generatedQuestion) {
        throw new Error(
          "Failed to generate question from both backend and direct API calls"
        );
      }

      // Validate required fields
      const requiredFields = [
        "title",
        "functionName",
        "description",
        "inputFormat",
        "outputFormat",
        "constraints",
        "boilerplateCode",
        "sampleTestCases",
        "hiddenTestCases",
      ];

      const missingFields = requiredFields.filter(
        (field) => !generatedQuestion[field]
      );
      if (missingFields.length > 0) {
        throw new Error(
          `Generated question is missing required fields: ${missingFields.join(
            ", "
          )}`
        );
      }

      // Validate boilerplateCode structure
      const requiredLanguages = ["javascript", "python", "java", "cpp"];
      const missingLanguages = requiredLanguages.filter(
        (lang) =>
          !generatedQuestion.boilerplateCode[lang] ||
          !generatedQuestion.boilerplateCode[lang].functionSignature
      );
      if (missingLanguages.length > 0) {
        throw new Error(
          `Boilerplate code missing for languages: ${missingLanguages.join(
            ", "
          )}`
        );
      }

      // Validate test cases
      if (
        !Array.isArray(generatedQuestion.sampleTestCases) ||
        generatedQuestion.sampleTestCases.length < 3
      ) {
        throw new Error("Must have at least 3 sample test cases");
      }
      if (
        !Array.isArray(generatedQuestion.hiddenTestCases) ||
        generatedQuestion.hiddenTestCases.length < 5
      ) {
        throw new Error("Must have at least 5 hidden test cases");
      }

      console.log("✓ Question validation passed");
      setQuestion(generatedQuestion);
      if (isEditorReady && monacoEditorRef.current) {
        const boilerplate =
          generatedQuestion.boilerplateCode[language].functionSignature;
        monacoEditorRef.current.setValue(boilerplate);
        setCode(boilerplate);
      }
    } catch (error) {
      console.error("Error generating question:", error);
      // Fallback to mock question
      const mockQuestion = generateMockQuestion();
      setQuestion(mockQuestion);
      if (isEditorReady && monacoEditorRef.current) {
        const boilerplate =
          mockQuestion.boilerplateCode[language].functionSignature;
        monacoEditorRef.current.setValue(boilerplate);
        setCode(boilerplate);
      }
      setApiError(
        `Failed to generate question. Using mock question for testing. Original error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModalMessage(null);
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const confirmBack = () => {
    // Save current progress if there's a question and code
    if (question && code && userId) {
      saveCode(question.title, language, code);
    }
    // Navigate back to dashboard
    window.location.href = "/";
  };

  const cancelBack = () => {
    setShowBackConfirm(false);
  };

  const submitToBackend = async (isSubmit) => {
    if (!question || isLoading) return;

    // Rate limiting for Judge0 API submissions
    const now = Date.now();
    if (
      lastSubmissionTime.current &&
      now - lastSubmissionTime.current < 60000
    ) {
      setApiError(
        "Please wait at least 60 seconds between submissions to avoid exceeding Judge0 API rate limits."
      );
      return;
    }
    lastSubmissionTime.current = now;

    setIsLoading(true);
    setFinalScore(null);
    setTestResults([]);
    setApiError(null);

    const testCases = isSubmit
      ? [...question.sampleTestCases, ...question.hiddenTestCases]
      : question.sampleTestCases;

    const fullCode = createRunnableCode(
      code,
      question.boilerplateCode[language].mainDriver
    );

    // Debug: Log the full code being sent to Judge0
    console.log("Full code being sent to Judge0:", fullCode);
    console.log("Code length:", fullCode.length);

    try {
      const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
      const JUDGE0_API_HOST = "judge0-ce.p.rapidapi.com";
      const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY;

      if (!JUDGE0_API_KEY) {
        throw new Error(
          "Judge0 API key is not configured. Please check your environment variables."
        );
      }

      const languageMap = {
        javascript: 63, // JavaScript (Node.js 14.17.0)
        python: 71, // Python (3.8.1)
        cpp: 54, // C++ (GCC 9.2.0)
        java: 62, // Java (OpenJDK 13.0.1)
      };

      const results = [];

      for (const testCase of testCases) {
        try {
          const { input, output } = testCase;

          const submissionResponse = await axios.post(
            `${JUDGE0_API_URL}?base64_encoded=false&wait=true`,
            {
              source_code: fullCode,
              language_id: languageMap[language],
              stdin: input,
              cpu_time_limit: 5,
              memory_limit: 128000,
            },
            {
              headers: {
                "X-RapidAPI-Host": JUDGE0_API_HOST,
                "X-RapidAPI-Key": JUDGE0_API_KEY,
                "Content-Type": "application/json",
              },
            }
          );

          const submission = submissionResponse.data;

          const actualOutput = (submission.stdout || "").trim();
          const expected = (output || "").trim();
          const passed =
            submission.status &&
            submission.status.id === 3 &&
            actualOutput === expected;

          results.push({
            passed,
            output:
              actualOutput ||
              submission.compile_output ||
              submission.stderr ||
              "",
            expectedOutput: output,
            input,
          });
        } catch (error) {
          results.push({
            passed: false,
            output: `Error: ${
              error.response
                ? JSON.stringify(error.response.data)
                : error.message
            }`,
            expectedOutput: testCase.output,
            input: testCase.input,
          });
        }
      }

      // Transform to frontend format
      const allResults = results.map((result, index) => ({
        status_id: result.passed ? 3 : 4,
        stdout: result.output,
        stderr: result.passed ? "" : "Wrong Answer",
        input: result.input,
        expected: result.expectedOutput || "",
        type: index < question.sampleTestCases.length ? "Sample" : "Hidden",
        time: "N/A",
        memory: "N/A",
      }));

      setTestResults(allResults);

      if (isSubmit) {
        const passedSubmissions = allResults.filter(
          (res) => res.status_id === 3
        );
        const score = (passedSubmissions.length / allResults.length) * 100;
        setFinalScore(score);

        // Save to local storage
        saveCodingTest({
          questionTitle: question.title,
          questionDescription: question.description,
          language: languageMap[language].name,
          totalTestCases: allResults.length,
          passedTestCases: passedSubmissions.length,
          score: passedSubmissions.length,
          percentage: score,
          submissionStatus:
            score === 100
              ? "completed"
              : score > 0
              ? "partial"
              : "not_attempted",
        });

        if (BACKEND_URL && userId) {
          const submissionData = {
            userId: userId,
            questionTitle: question.title,
            language: languageMap[language].name,
            score: score,
            passedCount: passedSubmissions.length,
            totalTestCases: allResults.length,
            submittedAt: new Date(),
            results: JSON.stringify(allResults),
          };

          try {
            await api.post("/submissions", submissionData);
            // Refresh submission history
            const historyResponse = await api.get(`/submissions/${userId}`);
            setSubmissionHistory(historyResponse.data);
          } catch (e) {
            console.error("Error saving submission to backend:", e);
            setApiError("Failed to save submission to backend.");
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error submitting code to backend:", error);
      setIsLoading(false);
      setApiError(
        `Failed to submit code for execution. Error: ${error.message}`
      );
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-4 font-sans antialiased">
      <style>{`
        .monaco-editor-container {
          height: 500px;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #333;
        }
        .animate-pulse-bg {
          animation: pulse-bg 2s infinite;
        }
        @keyframes pulse-bg {
          0%, 100% {
            background-color: #3f83f8;
          }
          50% {
            background-color: #2563eb;
          }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: #1a202c;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 10px 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
          max-width: 90%;
          min-width: 300px;
          text-align: center;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #333;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #555;
          border-radius: 4px;
        }
      `}</style>

      {modalMessage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="text-lg text-gray-200 mb-4">{modalMessage}</p>
            <button
              onClick={closeModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showBackConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-xl font-bold text-gray-200 mb-4">
              Confirm Navigation
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to go back? Your current code will be saved,
              but any unsaved test results will be lost.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={cancelBack}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBack}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* API Key Usage Banner */}
        {userApiKey && (
          <Alert className="mb-4 bg-green-900 border-green-700">
            <AlertDescription className="text-green-100">
              🔑 Using your personal Gemini API key for question generation.{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/?page=settings";
                }}
                className="underline hover:text-green-200"
              >
                Manage API keys
              </a>
            </AlertDescription>
          </Alert>
        )}
        {!userApiKey && (
          <Alert className="mb-4 bg-blue-900 border-blue-700">
            <AlertDescription className="text-blue-100">
              ℹ️ Using application's Gemini API key. To avoid rate limiting, add
              your own API key in{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/?page=settings";
                }}
                className="underline hover:text-blue-200"
              >
                Settings
              </a>
              .
            </AlertDescription>
          </Alert>
        )}

        <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-extrabold text-blue-400">
              AI Code Challenge
            </h1>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-gray-400">User ID:</span>
            <span className="bg-gray-800 text-blue-300 font-mono px-2 py-1 rounded-md text-sm truncate">
              {userId || "Loading..."}
            </span>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Question Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-200">
                Problem Statement
              </h2>
              <button
                onClick={handleGenerateQuestion}
                disabled={isLoading}
                className={`flex items-center gap-2 py-2 px-4 rounded-full font-semibold transition-colors ${
                  isLoading
                    ? "bg-blue-800 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white animate-pulse-bg"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate New Question
                    <Code className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {apiError && (
              <div className="bg-red-900 p-3 rounded-md text-red-300 mb-4">
                {apiError}
              </div>
            )}

            {isLoading && !question && (
              <div className="text-center text-gray-500 py-20">
                <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-blue-400">
                  The AI is generating your problem...
                </p>
              </div>
            )}

            {question && (
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xl font-bold mb-2">{question.title}</h3>
                <p className="text-gray-300 mb-4">{question.description}</p>

                <h4 className="text-lg font-semibold mt-4 mb-2">
                  Input Format
                </h4>
                <p className="text-gray-300 mb-4">{question.inputFormat}</p>

                <h4 className="text-lg font-semibold mb-2">Output Format</h4>
                <p className="text-gray-300 mb-4">{question.outputFormat}</p>

                <h4 className="text-lg font-semibold mb-2">Constraints</h4>
                <p className="text-gray-300 mb-4">{question.constraints}</p>

                <h4 className="text-lg font-semibold mb-2">
                  Sample Test Cases
                </h4>
                {question.sampleTestCases.map((test, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg mb-2">
                    <p className="font-mono text-sm text-gray-400">
                      Input: {test.input}
                    </p>
                    <p className="font-mono text-sm text-gray-400">
                      Output: {test.output}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Editor Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Your Solution
            </h2>

            <div className="flex items-center space-x-4 mb-4">
              <label htmlFor="language-select" className="text-gray-400">
                Language:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white p-2 rounded-md"
              >
                {Object.keys(languageMap).map((key) => (
                  <option key={key} value={key}>
                    {languageMap[key].name}
                  </option>
                ))}
              </select>
            </div>

            <div
              id="monaco-editor"
              className="monaco-editor-container flex-grow mb-4"
            ></div>

            <div className="flex justify-end gap-4 mt-auto">
              <button
                onClick={() => submitToBackend(false)}
                disabled={!question || isLoading}
                className={`flex items-center gap-2 py-2 px-6 rounded-full font-semibold transition-colors ${
                  !question || isLoading
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <Play className="w-4 h-4" />
                Run Code
              </button>
              <button
                onClick={() => submitToBackend(true)}
                disabled={!question || isLoading}
                className={`flex items-center gap-2 py-2 px-6 rounded-full font-semibold transition-colors ${
                  !question || isLoading
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Trophy className="w-4 h-4" />
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Results and Submission History */}
        <div className="mt-6 flex flex-col lg:flex-row gap-6">
          {/* Results Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Results</h2>

            {finalScore !== null && (
              <div className="mb-4 text-center">
                <p className="text-xl font-bold">
                  Final Score:
                  <span
                    className={`ml-2 font-extrabold ${
                      finalScore >= 80 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {finalScore.toFixed(0)} / 100
                  </span>
                </p>
                <p className="text-sm text-gray-400">
                  Hidden test cases are included in the score.
                </p>
              </div>
            )}

            <div className="overflow-y-auto max-h-96 pr-2 custom-scrollbar">
              {testResults.length > 0 ? (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg mb-2 border-l-4 ${
                      statusMap[result.status_id]?.color.replace(
                        "text",
                        "border"
                      ) || "border-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-lg font-semibold text-gray-100">
                        Test Case #{index + 1}
                      </p>
                      <Badge
                        className={`${
                          statusMap[result.status_id]?.color || "text-gray-400"
                        }`}
                      >
                        {statusMap[result.status_id]?.status || "Unknown"}
                      </Badge>
                    </div>
                    {result.status_id !== 6 && (
                      <>
                        <p className="text-gray-300 font-mono text-sm">
                          Input: {result.input}
                        </p>
                        <p className="text-gray-300 font-mono text-sm">
                          Your Output: {result.stdout || "No output"}
                        </p>
                        <p className="text-gray-300 font-mono text-sm">
                          Expected Output: {result.expected}
                        </p>
                      </>
                    )}
                    {result.stderr && (
                      <p className="text-red-300 text-sm">
                        Error: {result.stderr}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      Type: {result.type}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Runtime: {result.time}s
                    </p>
                    <p className="text-gray-400 text-xs">
                      Memory: {result.memory}kb
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">
                  Run or submit your code to see results here.
                </p>
              )}
            </div>
          </div>

          {/* Submission History Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Submission History
            </h2>
            <div className="overflow-y-auto max-h-96 pr-2 custom-scrollbar">
              {submissionHistory.length > 0 ? (
                submissionHistory.map((sub, index) => (
                  <div
                    key={sub._id || index}
                    className="bg-gray-700 p-4 rounded-lg mb-2"
                  >
                    <p className="text-lg font-semibold text-gray-200">
                      {sub.questionTitle}
                    </p>
                    <div className="text-sm text-gray-400 mt-1">
                      <p>Language: {sub.language}</p>
                      <p>
                        Score:{" "}
                        <span
                          className={`font-bold ${
                            sub.score >= 80 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {sub.score?.toFixed(0) || 0}
                        </span>{" "}
                        / 100
                      </p>
                      <p>
                        Passed: {sub.passedCount} / {sub.totalTestCases}
                      </p>
                      <p>
                        Submitted At:{" "}
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">
                  No submissions yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
