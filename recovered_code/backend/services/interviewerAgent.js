/**
 * AI Interviewer Agent Service
 * Handles adaptive interview logic with difficulty scaling,
 * context-aware questions, and intelligent feedback
 * Uses Gemini API for better rate limits and session persistence
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class InterviewerAgent {
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
   * Evaluate user response and determine difficulty level
   * Returns: { score, difficulty, feedback, nextQuestionDifficulty }
   */
  async evaluateResponse(question, userAnswer, interviewType = 'technical') {
    try {
      const evaluationPrompt = `
You are an expert technical interviewer evaluating a candidate's response.

Interview Type: ${interviewType}
Question: ${question}
Candidate's Answer: ${userAnswer}

Evaluate the response on these criteria:
1. Correctness (0-100): Is the answer factually correct?
2. Completeness (0-100): Does it cover all important aspects?
3. Clarity (0-100): Is it explained clearly?
4. Depth (0-100): Shows understanding of underlying concepts?
5. Confidence (0-100): Does the candidate seem confident?

Respond in JSON format:
{
  "score": <overall score 0-100>,
  "correctness": <number>,
  "completeness": <number>,
  "clarity": <number>,
  "depth": <number>,
  "confidence": <number>,
  "feedback": "<brief constructive feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "recommendedDifficulty": "<easy|medium|hard>",
  "topic": "<extracted topic>"
}
`;

      const response = await this.callGeminiAPI(evaluationPrompt, 0.7, this.maxTokens);
      const cleanedResponse = this.cleanJSON(response);
      const evaluation = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: evaluation
      };
    } catch (error) {
      console.error('Error evaluating response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate next question based on difficulty level and topics
   */
  async generateNextQuestion(
    interviewType = 'technical',
    difficulty = 'medium',
    topics = [],
    previousTopics = []
  ) {
    try {
      let prompt = '';

      if (interviewType === 'technical') {
        prompt = this.buildTechnicalQuestionPrompt(difficulty, topics, previousTopics);
      } else if (interviewType === 'hr') {
        prompt = this.buildHRQuestionPrompt(difficulty);
      } else if (interviewType === 'managerial') {
        prompt = this.buildManagerialQuestionPrompt(difficulty);
      }

      const response = await this.callGeminiAPI(prompt, 0.8, this.maxTokens);
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

  /**
   * Build technical question prompt based on difficulty
   */
  buildTechnicalQuestionPrompt(difficulty, topics = [], previousTopics = []) {
    const difficultyGuide = {
      easy: 'Basic conceptual questions about common topics',
      medium: 'Moderate complexity questions requiring practical knowledge',
      hard: 'Advanced questions requiring deep system design or algorithm knowledge'
    };

    const topicsList = topics.length > 0 ? topics.join(', ') : 'DSA, OOP, Database Design, or System Design';
    const avoidTopics = previousTopics.length > 0 ? `\n\nAvoid these previously covered topics: ${previousTopics.join(', ')}` : '';

    return `
Generate a ${difficulty} level technical interview question.
${difficultyGuide[difficulty] || difficultyGuide.medium}

Preferred Topics: ${topicsList}
${avoidTopics}

Respond with this JSON structure:
{
  "question": "<clear question>",
  "difficulty": "${difficulty}",
  "expectedKeywords": ["<keyword1>", "<keyword2>"],
  "modelAnswer": "<ideal answer>",
  "topic": "<main topic>",
  "hints": ["<hint1>", "<hint2>"],
  "followUpQuestions": ["<follow-up1>", "<follow-up2>"]
}
`;
  }

  /**
   * Build HR question prompt
   */
  buildHRQuestionPrompt(difficulty) {
    const questions = {
      easy: [
        'Tell me about yourself and your professional background',
        'Why are you interested in this role?',
        'What are your key strengths?'
      ],
      medium: [
        'Describe a challenging situation you overcame at work',
        'How do you handle conflicts with team members?',
        'What are your short-term and long-term career goals?'
      ],
      hard: [
        'Tell me about a time you failed. What did you learn?',
        'How do you balance multiple priorities under pressure?',
        'Describe your leadership style and give an example'
      ]
    };

    const selectedQuestions = questions[difficulty] || questions.medium;
    const randomQuestion = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];

    return `
Generate an HR interview question at ${difficulty} difficulty level.
Use this as reference: "${randomQuestion}"

Respond with this JSON structure:
{
  "question": "<HR question>",
  "difficulty": "${difficulty}",
  "category": "<communication|leadership|motivation|conflict-resolution|learning>",
  "expectedBehaviors": ["<behavior1>", "<behavior2>"],
  "redFlags": ["<red flag1>"],
  "greenFlags": ["<positive indicator1>"],
  "evaluationCriteria": "<what to look for in answer>"
}
`;
  }

  /**
   * Build managerial question prompt
   */
  buildManagerialQuestionPrompt(difficulty) {
    return `
Generate a managerial interview question at ${difficulty} difficulty level.

Respond with this JSON structure:
{
  "question": "<managerial question>",
  "difficulty": "${difficulty}",
  "category": "<decision-making|team-management|conflict-resolution|strategic-thinking>",
  "expectedApproach": "<ideal approach to solving>",
  "redFlags": ["<warning signs>"],
  "greenFlags": ["<positive signs>"]
}
`;
  }

  /**
   * Generate comprehensive interview feedback
   */
  async generateComprehensiveFeedback(
    interviewType,
    questionsWithAnswers,
    overallScore
  ) {
    try {
      const summaryPrompt = `
You are an expert interview coach providing feedback to a candidate.

Interview Type: ${interviewType}
Overall Score: ${overallScore}%

Questions and Answers Reviewed:
${questionsWithAnswers.map((qa, idx) => `
${idx + 1}. Q: ${qa.question}
   A: ${qa.answer}
   Score: ${qa.score}
`).join('\n')}

Provide constructive feedback in this JSON format:
{
  "overallAssessment": "<2-3 sentence summary>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "areasOfImprovement": ["<area1>", "<area2>"],
  "specificRecommendations": ["<recommendation1>", "<recommendation2>"],
  "readinessScore": <0-100>,
  "estimatedPerformance": "<excellent|good|average|needs-improvement>",
  "nextSteps": "<suggested actions for improvement>"
}
`;

      const response = await this.callGeminiAPI(summaryPrompt, 0.7, 1500);
      const cleanedResponse = this.cleanJSON(response);
      const feedback = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: feedback
      };
    } catch (error) {
      console.error('Error generating feedback:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine next difficulty based on performance
   */
  calculateNextDifficulty(score, currentDifficulty = 'medium') {
    const difficultyScale = ['easy', 'medium', 'hard'];
    const currentIndex = difficultyScale.indexOf(currentDifficulty);

    if (score >= 80) {
      // Excellent - increase difficulty
      return difficultyScale[Math.min(currentIndex + 1, 2)];
    } else if (score >= 60) {
      // Good - maintain difficulty
      return currentDifficulty;
    } else if (score >= 40) {
      // Average - decrease difficulty
      return difficultyScale[Math.max(currentIndex - 1, 0)];
    } else {
      // Poor - significantly decrease
      return 'easy';
    }
  }

  /**
   * Extract key topics from responses for tracking weak areas
   */
  async extractTopicsFromResponse(responses, interviewType = 'technical') {
    try {
      const extractionPrompt = `
Analyze these interview responses and extract the main topics covered:

${responses.map((r, idx) => `${idx + 1}. Q: ${r.question}\nA: ${r.answer}`).join('\n\n')}

Respond with this JSON format:
{
  "topicsCovered": ["<topic1>", "<topic2>"],
  "strongTopics": ["<topic>"],
  "weakTopics": ["<topic>"],
  "recommendedFocusAreas": ["<area1>", "<area2>"]
}
`;

      const response = await this.callGeminiAPI(extractionPrompt, 0.7, 800);
      const cleanedResponse = this.cleanJSON(response);
      const topics = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: topics
      };
    } catch (error) {
      console.error('Error extracting topics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new InterviewerAgent();
