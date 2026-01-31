/**
 * Company Simulation Agent Service
 * Creates company-specific interview profiles and generates
 * customized questions and interview flows based on company culture/role
 * Uses Gemini API for dynamic company profiling and question generation
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class CompanySimulationAgent {
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
      console.error('Gemini API Error (Company Simulation):', error.message);
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
   * Create a comprehensive company profile for interview simulation
   * Returns: { companyProfile, interviewFormat, cultureFit, expectations }
   */
  async createCompanyProfile(companyName, industry = '', companySize = 'medium', jobRole = '') {
    try {
      const profilePrompt = `
You are an expert HR professional creating detailed company interview profiles.

Company Information:
- Name: ${companyName}
- Industry: ${industry || 'Technology'}
- Size: ${companySize}
- Target Role: ${jobRole || 'Software Engineer'}

Generate a comprehensive company profile for interview simulation in JSON format:
{
  "companyProfile": {
    "name": "${companyName}",
    "industry": "<industry>",
    "size": "${companySize}",
    "culture": {
      "description": "<company culture description>",
      "values": ["<value1>", "<value2>", "<value3>", "<value4>"],
      "workStyle": "<remote|hybrid|on-site>",
      "teamDynamics": "<description>"
    },
    "knownForChallenges": [
      "<challenge type>"
    ],
    "interviewStyle": "<collaborative|competitive|formal|casual>"
  },
  "interviewFormat": {
    "totalRounds": <number>,
    "roundSequence": [
      {
        "round": <1|2|3|etc>,
        "name": "<Screen|Technical|Design|Behavioral|Culture Fit>",
        "duration": "<30 minutes|45 minutes|1 hour>",
        "interviewType": "<phone|video|in-person>",
        "focusAreas": ["<area>"],
        "questionCount": <number>,
        "difficulty": "<easy|medium|hard>"
      }
    ]
  },
  "cultureFitFactors": {
    "importantTraits": ["<trait>"],
    "dealBreakers": ["<red flag>"],
    "greenFlags": ["<positive indicator>"],
    "evaluationCriteria": {
      "<criterion>": "<description>"
    }
  },
  "roleExpectations": {
    "jobTitle": "${jobRole}",
    "keyResponsibilities": ["<responsibility>"],
    "requiredSkills": ["<skill>"],
    "preferredSkills": ["<skill>"],
    "seniorityLevel": "<junior|mid-level|senior>",
    "growthPath": ["<opportunity>"]
  },
  "interviewTips": {
    "topicsToDiscuss": ["<topic>"],
    "questionsToAsk": ["<question>"],
    "commonInterviewQuestions": ["<question>"],
    "recentProjectFocus": "<focus area>",
    "culturalInsights": ["<insight>"]
  }
}`;

      const response = await this.callGeminiAPI(profilePrompt);
      const cleanedResponse = this.cleanJSON(response);
      const profileData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: profileData
      };
    } catch (error) {
      console.error('Company Simulation Agent - createCompanyProfile error:', error);
      return {
        success: false,
        error: 'Failed to create company profile',
        details: error.message
      };
    }
  }

  /**
   * Generate company-specific technical interview questions
   * Returns: { questions with detailed context and evaluation criteria }
   */
  async generateCompanyQuestions(companyProfile, questionCount = 5, difficulty = 'medium') {
    try {
      const questionsPrompt = `
You are an expert technical interviewer creating company-specific interview questions.

Company Profile:
${JSON.stringify(companyProfile, null, 2)}

Question Requirements:
- Count: ${questionCount}
- Difficulty: ${difficulty}

Generate company-aligned interview questions in JSON format:
{
  "questions": [
    {
      "id": <number>,
      "question": "<interview question>",
      "category": "<system-design|data-structures|algorithms|behavioural|domain-specific>",
      "difficulty": "${difficulty}",
      "estimatedTime": "<minutes>",
      "context": "<company-specific context>",
      "hints": [
        "<hint if candidate struggles>"
      ],
      "evaluationCriteria": {
        "<criterion>": {
          "weight": <0-100>,
          "description": "<what to look for>"
        }
      },
      "goodAnswerExamples": [
        {
          "approach": "<approach name>",
          "description": "<description>",
          "timeComplexity": "<O(n)>",
          "spaceComplexity": "<O(n)>"
        }
      ],
      "redFlags": [
        "<sign of weak understanding>"
      ],
      "greenFlags": [
        "<sign of strong understanding>"
      ],
      "followUpQuestions": [
        "<if they answer well>"
      ]
    }
  ],
  "assessmentGuidelines": {
    "excellentScore": {
      "threshold": "<85-100>",
      "indicators": ["<indicator>"]
    },
    "goodScore": {
      "threshold": "<70-84>",
      "indicators": ["<indicator>"]
    },
    "satisfactoryScore": {
      "threshold": "<50-69>",
      "indicators": ["<indicator>"]
    },
    "poorScore": {
      "threshold": "<0-49>",
      "indicators": ["<indicator>"]
    }
  }
}`;

      const response = await this.callGeminiAPI(questionsPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const questionsData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: questionsData
      };
    } catch (error) {
      console.error('Company Simulation Agent - generateCompanyQuestions error:', error);
      return {
        success: false,
        error: 'Failed to generate company questions',
        details: error.message
      };
    }
  }

  /**
   * Generate company-specific behavioral questions
   * Returns: { behavioral questions aligned with company values }
   */
  async generateBehavioralQuestions(companyProfile, questionCount = 4) {
    try {
      const behavioralPrompt = `
You are an expert behavioral interviewer creating company-culture-aligned questions.

Company Profile:
${JSON.stringify(companyProfile, null, 2)}

Generate ${questionCount} behavioral questions aligned with company values in JSON format:
{
  "behavioralQuestions": [
    {
      "id": <number>,
      "question": "<behavioral question>",
      "alignedValue": "<company value>",
      "category": "<teamwork|leadership|problem-solving|adaptability|communication>",
      "evaluationFocus": [
        "<what to evaluate>"
      ],
      "expectedAnswerStructure": {
        "situation": "<describe situation>",
        "task": "<your responsibility>",
        "action": "<what you did>",
        "result": "<outcome>"
      },
      "greenFlags": [
        "<positive indicator>"
      ],
      "redFlags": [
        "<concern indicator>"
      ],
      "cultureAlignment": {
        "factor": "<how this tests culture fit>",
        "importance": "<critical|important|nice-to-have>"
      }
    }
  ]
}`;

      const response = await this.callGeminiAPI(behavioralPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const behavioralData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: behavioralData
      };
    } catch (error) {
      console.error('Company Simulation Agent - generateBehavioralQuestions error:', error);
      return {
        success: false,
        error: 'Failed to generate behavioral questions',
        details: error.message
      };
    }
  }

  /**
   * Customize entire interview flow based on company and candidate profile
   * Returns: { customizedFlow, timing, emphasis, strategy }
   */
  async customizeInterviewFlow(companyProfile, candidateLevel = 'mid-level') {
    try {
      const flowPrompt = `
You are an interview strategist designing a customized interview flow.

Company Profile:
${JSON.stringify(companyProfile, null, 2)}

Candidate Level: ${candidateLevel}

Design a customized interview flow in JSON format:
{
  "interviewStrategy": {
    "overall_approach": "<focus area for this company>",
    "emphasis": {
      "technical": <0-100>,
      "behavioral": <0-100>,
      "cultureFit": <0-100>,
      "systemDesign": <0-100>,
      "communication": <0-100>
    }
  },
  "customizedFlow": [
    {
      "round": <number>,
      "name": "<round name>",
      "duration": "<minutes>",
      "objectives": [
        "<objective>"
      ],
      "questionDistribution": {
        "<category>": <count>
      },
      "difficulty": "<easy|medium|hard>",
      "evaluationWeight": <0-100>,
      "adaptiveStrategy": {
        "ifAnswerWell": "<do this>",
        "ifAnswerPoorly": "<do this>"
      }
    }
  ],
  "scoringWeights": {
    "technical": <0-100>,
    "communication": <0-100>,
    "problemSolving": <0-100>,
    "cultureFit": <0-100>,
    "leadershipPotential": <0-100>
  },
  "passFailCriteria": {
    "minimumScore": <0-100>,
    "criticalAreas": [
      {
        "area": "<area>",
        "minimumRequired": <0-100>,
        "rationale": "<why this matters>"
      }
    ]
  },
  "candidateFeedback": {
    "typicalQuestions": [
      "<question candidates ask>"
    ],
    "expectedAnswers": [
      "<what to say>"
    ]
  }
}`;

      const response = await this.callGeminiAPI(flowPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const flowData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: flowData
      };
    } catch (error) {
      console.error('Company Simulation Agent - customizeInterviewFlow error:', error);
      return {
        success: false,
        error: 'Failed to customize interview flow',
        details: error.message
      };
    }
  }

  /**
   * Analyze how well candidate fits company culture and role
   * Returns: { companyFitScore, cultureFitAnalysis, recommendations }
   */
  async analyzeCompanyFit(companyProfile, candidateResponses = []) {
    try {
      const fitAnalysisPrompt = `
You are an HR analyst assessing cultural and role fit.

Company Profile:
${JSON.stringify(companyProfile, null, 2)}

Candidate Interview Responses:
${JSON.stringify(candidateResponses, null, 2)}

Analyze company fit in JSON format:
{
  "companyFitScore": <0-100>,
  "cultureFitScore": <0-100>,
  "roleFitScore": <0-100>,
  "overallFitLevel": "<excellent|good|fair|poor>",
  "cultureFitAnalysis": {
    "alignedValues": [
      {
        "value": "<company value>",
        "candidateAlignment": <0-100>,
        "evidence": "<from responses>"
      }
    ],
    "misalignedValues": [
      {
        "value": "<company value>",
        "gap": <0-100>,
        "concern": "<specific concern>"
      }
    ],
    "workStyleMatch": {
      "score": <0-100>,
      "assessment": "<how well they match work style>"
    }
  },
  "roleReadiness": {
    "technicalReadiness": <0-100>,
    "communicationReadiness": <0-100>,
    "leadershipReadiness": <0-100>,
    "overallReadiness": <0-100>
  },
  "recommendations": {
    "proceed": <true|false>,
    "nextSteps": [
      "<recommendation>"
    ],
    "areasToImprove": [
      "<area>"
    ],
    "strengths": [
      "<strength>"
    ]
  }
}`;

      const response = await this.callGeminiAPI(fitAnalysisPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const fitData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: fitData
      };
    } catch (error) {
      console.error('Company Simulation Agent - analyzeCompanyFit error:', error);
      return {
        success: false,
        error: 'Failed to analyze company fit',
        details: error.message
      };
    }
  }
}

export default new CompanySimulationAgent();
