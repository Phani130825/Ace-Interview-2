/**
 * HR Behavior Agent Service
 * Analyzes behavioral responses, communication patterns,
 * confidence levels, and provides HR-specific feedback
 * Uses Gemini API for better rate limits and session persistence
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class HRBehaviorAgent {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
    this.maxTokens = 1500;
  }

  /**
   * Call Gemini API with structured prompt
   */
  async callGeminiAPI(prompt, temperature = 0.7, maxTokens = 1500) {
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
   * Analyze behavioral response for quality, confidence, and red flags
   */
  async analyzeBehavioralResponse(question, answer, questionCategory = 'general') {
    try {
      const analysisPrompt = `
You are an expert HR professional evaluating behavioral interview responses.

Question Category: ${questionCategory}
Question: ${question}
Candidate's Answer: ${answer}

Analyze this response on these dimensions in JSON format:
{
  "overallScore": <0-100>,
  "communicationQuality": {
    "score": <0-100>,
    "clarity": <0-100>,
    "conciseness": <0-100>,
    "structuredness": <0-100>,
    "feedback": "<specific feedback>"
  },
  "confidenceLevel": {
    "score": <0-100>,
    "indicators": ["<positive-indicator>"],
    "concerns": ["<concern>"]
  },
  "contentAnalysis": {
    "relevance": <0-100>,
    "specificityLevel": <0-100>,
    "exampleQuality": <0-100>,
    "lessonsLearned": <boolean>,
    "growthMindset": <boolean>
  },
  "redFlags": ["<red-flag1>"],
  "greenFlags": ["<green-flag1>", "<green-flag2>"],
  "categorySpecificScore": <0-100>,
  "competenciesDemonstrated": ["<competency1>", "<competency2>"],
  "improvementAreas": ["<area1>"],
  "recommendedFollowUp": "<follow-up question>"
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
      console.error('Error analyzing behavioral response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect communication patterns across multiple responses
   */
  async analyzeCommunicationPatterns(responses) {
    try {
      const patternPrompt = `
Analyze the following HR interview responses to identify communication patterns:

${responses.map((r, idx) => `
Response ${idx + 1} (${r.category}):
Q: ${r.question}
A: ${r.answer}
`).join('\n')}

Identify patterns in JSON format:
{
  "communicationStyle": {
    "style": "<analytical|collaborative|leadership|supportive>",
    "consistency": <0-100>,
    "description": "<2-3 sentence description>"
  },
  "confidencePatterns": {
    "overallConfidence": <0-100>,
    "consistency": <0-100>,
    "indicators": ["<indicator>"]
  },
  "stressHandling": {
    "apparentMethod": "<approach>",
    "effectiveness": <0-100>,
    "examples": ["<example>"]
  },
  "adaptability": {
    "demonstratedLevel": <0-100>,
    "learningFromMistakes": <boolean>,
    "examples": ["<example>"]
  },
  "teamworkIndicators": {
    "collaborationScore": <0-100>,
    "leadershipScore": <0-100>,
    "supportivenessScore": <0-100>,
    "examples": ["<example>"]
  },
  "cultureAlignment": {
    "score": <0-100>,
    "strengths": ["<strength>"],
    "concerns": ["<concern>"]
  },
  "overallHRAssessment": <0-100>,
  "hireability": "<strong-yes|yes|maybe|no>",
  "reasoning": "<reasoning>"
}
`;

      const response = await this.callGeminiAPI(patternPrompt, 0.7, this.maxTokens);
      const cleanedResponse = this.cleanJSON(response);
      const patterns = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: patterns
      };
    } catch (error) {
      console.error('Error analyzing communication patterns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate targeted behavioral feedback
   */
  async generateBehavioralFeedback(interviewResponses, overallAssessment) {
    try {
      const feedbackPrompt = `
Provide comprehensive behavioral interview feedback for a candidate:

Interview Responses Summary:
${JSON.stringify(interviewResponses, null, 2)}

Overall Assessment:
${JSON.stringify(overallAssessment, null, 2)}

Generate constructive feedback in JSON format:
{
  "executiveSummary": "<2-3 sentence summary of overall fit>",
  "strengths": [
    {
      "strength": "<what they do well>",
      "evidence": "<specific example from responses>",
      "impact": "<why this matters>"
    }
  ],
  "areasForGrowth": [
    {
      "area": "<area to improve>",
      "evidence": "<where this showed up>",
      "suggestion": "<how to improve>",
      "priority": "<high|medium|low>"
    }
  ],
  "cultureAlignment": {
    "alignment": <0-100>,
    "aligningTraits": ["<trait>"],
    "potentialMisalignments": ["<misalignment>"]
  },
  "performancePrediction": {
    "estimatedPerformance": "<month-3|month-6|month-12>",
    "reasoning": "<reasoning>",
    "developmentNeeds": ["<need>"]
  },
  "specificRecommendations": [
    {
      "recommendation": "<specific action>",
      "timeline": "<when to implement>",
      "owner": "<who should do this>"
    }
  ],
  "interviewerNotes": "<additional observations>",
  "recommendedNextStep": "<move-forward|schedule-next-round|pass>"
}
`;

      const response = await this.callGeminiAPI(feedbackPrompt, 0.7, 2000);
      const cleanedResponse = this.cleanJSON(response);
      const feedback = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: feedback
      };
    } catch (error) {
      console.error('Error generating behavioral feedback:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect red flags and risk factors
   */
  async detectRedFlags(responses) {
    try {
      const flagPrompt = `
Analyze these HR interview responses for potential red flags:

${responses.map((r, idx) => `${idx + 1}. Q: ${r.question}\nA: ${r.answer}`).join('\n\n')}

Identify concerns in JSON format:
{
  "criticalRedFlags": [
    {
      "flag": "<flag>",
      "severity": "<critical|high|medium>",
      "evidence": "<where this appears>",
      "implication": "<what it suggests>"
    }
  ],
  "concerns": ["<concern>"],
  "verificationNeeded": ["<what-to-verify>"],
  "riskLevel": "<low|medium|high>",
  "recommendedAction": "<follow-up|additional-assessment|pass>",
  "qualifyingFactors": ["<positive-factor>"]
}
`;

      const response = await this.callGeminiAPI(flagPrompt, 0.6, 1200);
      const cleanedResponse = this.cleanJSON(response);
      const flags = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: flags
      };
    } catch (error) {
      console.error('Error detecting red flags:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate HR interview score
   */
  async calculateHRScore(analysisResults) {
    const weights = {
      communication: 0.25,
      confidence: 0.20,
      cultural_fit: 0.25,
      competencies: 0.20,
      no_red_flags: 0.10
    };

    const communicationScore = analysisResults.avgCommunication || 70;
    const confidenceScore = analysisResults.avgConfidence || 70;
    const culturalFitScore = analysisResults.culturalFit || 70;
    const competenciesScore = analysisResults.competenciesScore || 70;
    const redFlagsScore = analysisResults.redFlags.length === 0 ? 100 : 50;

    const totalScore =
      (communicationScore * weights.communication) +
      (confidenceScore * weights.confidence) +
      (culturalFitScore * weights.cultural_fit) +
      (competenciesScore * weights.competencies) +
      (redFlagsScore * weights.no_red_flags);

    return Math.round(totalScore);
  }

  /**
   * Generate next behavioral question based on gaps
   */
  async generateNextQuestion(previousTopics = [], focusArea = 'general') {
    try {
      let prompt = '';

      if (focusArea === 'stress-handling') {
        prompt = `Generate a behavioral question to assess how the candidate handles stress and pressure.`;
      } else if (focusArea === 'teamwork') {
        prompt = `Generate a behavioral question to assess teamwork, collaboration, and interpersonal skills.`;
      } else if (focusArea === 'leadership') {
        prompt = `Generate a behavioral question to assess leadership abilities and initiative.`;
      } else if (focusArea === 'conflict-resolution') {
        prompt = `Generate a behavioral question to assess conflict resolution and communication skills.`;
      } else {
        prompt = `Generate a behavioral question for HR interview.`;
      }

      if (previousTopics.length > 0) {
        prompt += `\n\nAvoid these previously covered topics: ${previousTopics.join(', ')}`;
      }

      prompt += `\n\nRespond with this JSON format:
{
  "question": "<behavioral question>",
  "category": "<stress|teamwork|leadership|motivation|conflict|communication>",
  "focusArea": "${focusArea}",
  "keyIndicators": ["<what to listen for>"],
  "followUpQuestions": ["<follow-up1>", "<follow-up2>"],
  "durationExpected": "<minutes>"
}`;

      const response = await this.callGeminiAPI(prompt, 0.8, 800);
      const cleanedResponse = this.cleanJSON(response);
      const question = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: question
      };
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new HRBehaviorAgent();
