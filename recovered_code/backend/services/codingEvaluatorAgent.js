/**
 * AI Coding Evaluator Agent Service
 * Analyzes code submissions for quality, logic, complexity,
 * detects weak topics, and generates targeted practice problems
 * Uses Gemini API for better rate limits and session persistence
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class CodingEvaluatorAgent {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
    this.maxTokens = 2000;
  }

  /**
   * Call Gemini API with structured prompt
   */
  async callGeminiAPI(prompt, temperature = 0.7, maxTokens = 2000) {
    try {
      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 64
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_UNSPECIFIED',
              threshold: 'BLOCK_NONE'
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      throw error;
    }
  }

  /**
   * Clean JSON response from Gemini (removes markdown code blocks)
   */
  cleanJSON(text) {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBracket = cleaned.indexOf('{');
    const lastBracket = cleaned.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
    return cleaned;
  }

  /**
   * Comprehensive code analysis
   * Returns: quality score, logic analysis, complexity, edge cases covered
   */
  async analyzeCode(code, language, problemStatement) {
    try {
      const analysisPrompt = `
You are an expert code reviewer and technical interviewer.

Language: ${language}
Problem Statement: ${problemStatement}

Code to Review:
\`\`\`${language}
${code}
\`\`\`

Analyze this code and provide detailed feedback in JSON format:
{
  "codeQuality": {
    "score": <0-100>,
    "readability": <0-100>,
    "maintainability": <0-100>,
    "documentation": <0-100>
  },
  "logicAnalysis": {
    "isCorrect": <boolean>,
    "issues": ["<issue1>"],
    "edgeCasesHandled": ["<case1>", "<case2>"],
    "edgeCasesMissing": ["<missing-case1>"],
    "testCoverageEstimate": <0-100>
  },
  "complexity": {
    "timeComplexity": "<Big-O notation>",
    "spaceComplexity": "<Big-O notation>",
    "isOptimal": <boolean>,
    "optimizationSuggestions": ["<suggestion1>"]
  },
  "patterns": {
    "usedPatterns": ["<pattern1>"],
    "missingPatterns": ["<pattern>"],
    "bestPractices": ["<practice>"],
    "violatedPrinciples": ["<principle>"]
  },
  "topicsIdentified": ["<topic1>", "<topic2>"],
  "strengthAreas": ["<area1>"],
  "weakAreas": ["<area1>"],
  "overallScore": <0-100>,
  "verdict": "<accepted|needs-improvement|rejected>"
}
`;

      const response = await this.callGeminiAPI(analysisPrompt, 0.7, this.maxTokens);
      const cleanedResponse = this.cleanJSON(response);
      const analysis = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('Error analyzing code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect weak topics based on code analysis
   * Returns: weak areas, recommended problems, learning resources
   */
  async detectWeakTopics(codeAnalyses) {
    try {
      const weakTopicPrompt = `
Analyze these code submission results and identify weak areas:

${codeAnalyses.map((analysis, idx) => `
Submission ${idx + 1}:
- Problem: ${analysis.problem}
- Score: ${analysis.score}
- Weak Areas: ${analysis.weakAreas.join(', ')}
- Topics: ${analysis.topicsIdentified.join(', ')}
`).join('\n')}

Identify the candidate's weak topics and provide a learning plan in JSON format:
{
  "weakTopics": ["<topic1>", "<topic2>"],
  "frequencyAnalysis": {
    "<topic>": <occurrence-count>
  },
  "recommendedProblems": [
    {
      "title": "<problem-title>",
      "difficulty": "<easy|medium|hard>",
      "topic": "<topic>",
      "reason": "<why this problem>",
      "estimatedTime": "<minutes>"
    }
  ],
  "learningPath": ["<step1>", "<step2>"],
  "estimatedTimeToMastery": "<weeks>",
  "focusAreas": ["<area1>", "<area2>"]
}
`;

      const response = await this.callGeminiAPI(weakTopicPrompt, 0.8, 1500);
      const cleanedResponse = this.cleanJSON(response);
      const analysis = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('Error detecting weak topics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate coding problems based on weak topics
   */
  async generateProblemFromTopic(topic, difficulty = 'medium', language = 'python') {
    try {
      const generationPrompt = `
Generate a coding problem focused on the topic: ${topic}
Difficulty Level: ${difficulty}
Language: ${language}

Create a problem with these sections in JSON format:
{
  "title": "<catchy problem title>",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "description": "<detailed problem statement>",
  "examples": [
    {
      "input": "<example input>",
      "output": "<example output>",
      "explanation": "<explanation>"
    }
  ],
  "constraints": ["<constraint1>", "<constraint2>"],
  "hints": ["<hint1>", "<hint2>", "<hint3>"],
  "expectedApproach": "<algorithm/approach>",
  "timeComplexity": "<Big-O>",
  "spaceComplexity": "<Big-O>",
  "testCases": [
    { "input": "", "output": "", "description": "<edge-case>" }
  ],
  "followUpProblems": ["<problem-title1>"]
}
`;

      const response = await this.callGeminiAPI(generationPrompt, 0.8, 2500);
      const cleanedResponse = this.cleanJSON(response);
      const problem = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: problem
      };
    } catch (error) {
      console.error('Error generating problem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Provide detailed improvement suggestions
   */
  async generateImprovementPlan(codeAnalysis, submissionHistory) {
    try {
      const improvementPrompt = `
Candidate's Code Quality Analysis:
${JSON.stringify(codeAnalysis, null, 2)}

Recent Submission History:
${submissionHistory.map(s => `- ${s.problem}: Score ${s.score}/100`).join('\n')}

Create a personalized improvement plan in JSON format:
{
  "immediateImprovements": [
    {
      "issue": "<specific issue>",
      "solution": "<how to fix>",
      "priority": "<high|medium|low>",
      "estimatedDifficultyToFix": "<easy|moderate|hard>"
    }
  ],
  "codeReviewComments": [
    {
      "line": "<line number or section>",
      "comment": "<specific feedback>",
      "suggestion": "<how to improve>",
      "severity": "<critical|important|minor>"
    }
  ],
  "designPatternSuggestions": ["<pattern>"],
  "performanceOptimizations": ["<optimization>"],
  "testingImprovements": ["<testing-strategy>"],
  "nextProblemDifficulty": "<easy|medium|hard>",
  "estimatedTimeToImprove": "<hours>"
}
`;

      const response = await this.callGeminiAPI(improvementPrompt, 0.7, 2000);
      const cleanedResponse = this.cleanJSON(response);
      const plan = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: plan
      };
    } catch (error) {
      console.error('Error generating improvement plan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Score code based on multiple factors
   */
  calculateCodingScore(analysis) {
    const weights = {
      correctness: 0.40,      // Most important
      complexity: 0.20,       // Efficiency matters
      codeQuality: 0.20,      // Readability & maintainability
      edgeCases: 0.20         // Robustness
    };

    const correctnessScore = analysis.logicAnalysis.isCorrect ? 100 : analysis.codeQuality.score;
    const complexityScore = analysis.complexity.isOptimal ? 100 : 70;
    const codeQualityScore = analysis.codeQuality.score;
    const edgeCaseScore = analysis.logicAnalysis.edgeCasesHandled.length > 0 ? 80 : 50;

    const totalScore =
      (correctnessScore * weights.correctness) +
      (complexityScore * weights.complexity) +
      (codeQualityScore * weights.codeQuality) +
      (edgeCaseScore * weights.edgeCases);

    return Math.round(totalScore);
  }

  /**
   * Adaptive difficulty selector
   */
  selectNextProblemDifficulty(recentScores) {
    if (recentScores.length === 0) return 'easy';

    const avgScore = recentScores.reduce((a, b) => a + b) / recentScores.length;

    if (avgScore >= 85) {
      return 'hard';
    } else if (avgScore >= 70) {
      return 'medium';
    } else {
      return 'easy';
    }
  }
}

export default new CodingEvaluatorAgent();
