/**
 * Personalized Mentor Agent Service
 * Analyzes placement simulation performance data and generates
 * customized learning roadmaps with targeted recommendations
 * Uses Gemini API for intelligent analysis and guidance
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MentorAgent {
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
      console.error('Gemini API Error (Mentor):', error.message);
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
   * Analyze placement simulation data to identify strengths and weaknesses
   * Returns: { strengths, weaknesses, performanceMetrics }
   */
  async analyzePlacementData(placementData) {
    try {
      const analysisPrompt = `
You are an expert career mentor analyzing a student's placement simulation performance.

Placement Performance Data:
${JSON.stringify(placementData, null, 2)}

Analyze this comprehensive placement data and provide insights in JSON format:
{
  "overallPerformance": {
    "score": <0-100>,
    "percentile": <0-100>,
    "readinessLevel": "<not-ready|developing|ready|highly-ready>"
  },
  "strengths": [
    {
      "area": "<technical|communication|problem-solving|behavioral>",
      "score": <0-100>,
      "description": "<what they did well>",
      "examples": ["<specific example>"]
    }
  ],
  "weaknesses": [
    {
      "area": "<technical|communication|problem-solving|behavioral>",
      "score": <0-100>,
      "severity": "<low|medium|high>",
      "description": "<what needs improvement>",
      "impact": "<how this affects placement>"
    }
  ],
  "performanceMetrics": {
    "technicalScore": <0-100>,
    "codingScore": <0-100>,
    "communicationScore": <0-100>,
    "behavioralScore": <0-100>,
    "overallScore": <0-100>
  },
  "keyObservations": [
    "<important observation>"
  ]
}`;

      const response = await this.callGeminiAPI(analysisPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const analysisData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: analysisData
      };
    } catch (error) {
      console.error('Mentor Agent - analyzePlacementData error:', error);
      return {
        success: false,
        error: 'Failed to analyze placement data',
        details: error.message
      };
    }
  }

  /**
   * Generate personalized learning roadmap based on performance analysis
   * Returns: { roadmap, timeline, milestones, resources }
   */
  async generateLearningRoadmap(performanceAnalysis, targetRole = 'Software Engineer') {
    try {
      const roadmapPrompt = `
You are an expert career development coach creating a personalized learning roadmap.

Student Performance Analysis:
${JSON.stringify(performanceAnalysis, null, 2)}

Target Role: ${targetRole}

Create a detailed, actionable learning roadmap in JSON format:
{
  "roadmapTitle": "<personalized title>",
  "targetRole": "${targetRole}",
  "duration": "<6 weeks|3 months|6 months|1 year>",
  "phases": [
    {
      "phase": <1|2|3|etc>,
      "phaseName": "<Foundation|Intermediate|Advanced|Interview Prep>",
      "duration": "<2 weeks|3 weeks|1 month|etc>",
      "goals": ["<specific, measurable goal>"],
      "topics": [
        {
          "topic": "<skill or concept>",
          "priority": "<high|medium|low>",
          "currentLevel": "<beginner|intermediate|advanced>",
          "targetLevel": "<intermediate|advanced|expert>",
          "estimatedHours": <number>,
          "resources": [
            {
              "type": "<book|course|practice|project>",
              "name": "<resource name>",
              "link": "<url if available>"
            }
          ]
        }
      ],
      "practiceProjects": [
        {
          "name": "<project name>",
          "difficulty": "<easy|medium|hard>",
          "skills": ["<skill1>", "<skill2>"],
          "estimatedHours": <number>
        }
      ],
      "milestones": [
        {
          "milestone": "<checkpoint>",
          "targetDate": "<week X>",
          "successCriteria": "<measurable criteria>"
        }
      ]
    }
  ],
  "weeklySchedule": {
    "hoursPerWeek": <number>,
    "breakdownByDay": {
      "monday": "<activities>",
      "tuesday": "<activities>",
      "wednesday": "<activities>",
      "thursday": "<activities>",
      "friday": "<activities>",
      "weekend": "<activities>"
    }
  },
  "assessmentPoints": [
    {
      "week": <number>,
      "assessmentType": "<coding-challenge|mock-interview|project-review>",
      "successCriteria": "<criteria>"
    }
  ],
  "expectedOutcomes": [
    "<what student will be able to do>"
  ]
}`;

      const response = await this.callGeminiAPI(roadmapPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const roadmapData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: roadmapData
      };
    } catch (error) {
      console.error('Mentor Agent - generateLearningRoadmap error:', error);
      return {
        success: false,
        error: 'Failed to generate learning roadmap',
        details: error.message
      };
    }
  }

  /**
   * Generate personalized recommendations based on analysis
   * Returns: { immediateActions, resourceRecommendations, mockInterviewTopics, interviewPrep }
   */
  async generateRecommendations(performanceAnalysis, weaknessAreas = []) {
    try {
      const recommendationPrompt = `
You are an expert career coach providing personalized recommendations for placement success.

Performance Analysis:
${JSON.stringify(performanceAnalysis, null, 2)}

Areas to Focus On:
${weaknessAreas.join('\n')}

Provide actionable recommendations in JSON format:
{
  "immediateActions": [
    {
      "action": "<specific action>",
      "priority": "<high|medium|low>",
      "timeline": "<do this today|this week|this month>",
      "expectedImpact": "<how this helps>",
      "estimatedTime": "<15 minutes|1 hour|2-3 hours>"
    }
  ],
  "resourceRecommendations": [
    {
      "resource": "<specific resource>",
      "type": "<tutorial|course|book|practice-platform>",
      "topic": "<what it covers>",
      "estimatedHours": <number>,
      "difficulty": "<beginner|intermediate|advanced>",
      "priority": "<must-do|should-do|nice-to-do>",
      "link": "<URL if available>"
    }
  ],
  "mockInterviewTopics": [
    {
      "topic": "<interview topic>",
      "difficulty": "<easy|medium|hard>",
      "focusAreas": ["<specific area>"],
      "commonQuestions": ["<example question>"],
      "preparationTips": ["<tip>"]
    }
  ],
  "interviewPreparationPlan": {
    "technicalPrep": {
      "focusAreas": ["<area>"],
      "estimatedHours": <number>,
      "recommendedTopics": ["<topic>"]
    },
    "behavioralPrep": {
      "focusAreas": ["<area>"],
      "estimatedHours": <number>,
      "sampleQuestions": ["<question>"]
    },
    "communicationPrep": {
      "focusAreas": ["<area>"],
      "estimatedHours": <number>,
      "practiceExercises": ["<exercise>"]
    }
  },
  "successMetrics": {
    "weeklyGoals": ["<goal>"],
    "monthlyTargets": {
      "technicalScore": <target>,
      "communicationScore": <target>,
      "overallScore": <target>
    }
  }
}`;

      const response = await this.callGeminiAPI(recommendationPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const recommendationData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: recommendationData
      };
    } catch (error) {
      console.error('Mentor Agent - generateRecommendations error:', error);
      return {
        success: false,
        error: 'Failed to generate recommendations',
        details: error.message
      };
    }
  }

  /**
   * Track progress on learning roadmap and suggest adjustments
   * Returns: { progressScore, completionPercentage, nextSteps, adjustments }
   */
  async trackProgress(roadmapId, completedTasks = [], currentScores = {}) {
    try {
      const progressPrompt = `
You are a career development mentor tracking student progress on a learning roadmap.

Completed Tasks: ${completedTasks.length}
Current Scores: ${JSON.stringify(currentScores, null, 2)}

Track progress and suggest adjustments in JSON format:
{
  "progressScore": <0-100>,
  "completionPercentage": <0-100>,
  "paceAssessment": "<on-track|ahead|behind>",
  "completedMilestones": [
    {
      "milestone": "<completed milestone>",
      "completionDate": "<date>",
      "performance": "<exceeded|met|partially-met>",
      "feedback": "<feedback>"
    }
  ],
  "nextSteps": [
    {
      "step": "<next step>",
      "priority": "<high|medium|low>",
      "deadline": "<target date>",
      "resources": ["<resource>"]
    }
  ],
  "roadmapAdjustments": [
    {
      "adjustment": "<suggested change>",
      "reason": "<why this adjustment>",
      "impact": "<expected impact>"
    }
  ],
  "motivationalInsights": [
    "<encouraging message>"
  ],
  "projectedOutcome": {
    "estimatedReadiness": "<percentage>",
    "likelyOutcome": "<job title or outcome>",
    "confidence": "<high|medium|low>"
  }
}`;

      const response = await this.callGeminiAPI(progressPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const progressData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: progressData
      };
    } catch (error) {
      console.error('Mentor Agent - trackProgress error:', error);
      return {
        success: false,
        error: 'Failed to track progress',
        details: error.message
      };
    }
  }
}

export default new MentorAgent();
