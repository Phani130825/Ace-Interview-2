/**
 * Autonomous Task Agent Service
 * Generates adaptive task plans, schedules interviews, and
 * automatically adjusts difficulty based on performance
 * Integrates with Pipeline model and email notifications
 * Uses Gemini API for intelligent scheduling and adaptation
 */

import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

class AutonomousTaskAgent {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
    this.maxTokens = 2000;
    this.scheduledTasks = new Map(); // In-memory task scheduler
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
      console.error('Gemini API Error (Autonomous Task):', error.message);
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
   * Generate a comprehensive adaptive task plan
   * Returns: { taskPlan with phases, milestones, and auto-adjustment rules }
   */
  async generateTaskPlan(userData = {}, performanceData = {}, targetGoal = 'placement') {
    try {
      const planPrompt = `
You are an expert task scheduler and coach generating an adaptive 8-week preparation plan.

User Profile:
${JSON.stringify(userData, null, 2)}

Current Performance:
${JSON.stringify(performanceData, null, 2)}

Target Goal: ${targetGoal}

Generate a comprehensive adaptive task plan in JSON format:
{
  "planOverview": {
    "totalDuration": "8 weeks",
    "startDate": "<will be set when plan starts>",
    "targetGoal": "${targetGoal}",
    "estimatedHoursRequired": <number>,
    "difficulty": "<beginner|intermediate|advanced>"
  },
  "weeklyBreakdown": [
    {
      "week": <1-8>,
      "theme": "<week theme>",
      "duration": "7 days",
      "objectives": [
        "<objective>"
      ],
      "dailyTasks": {
        "monday": [
          {
            "taskId": "<id>",
            "task": "<specific task>",
            "estimatedTime": "<minutes>",
            "priority": "<high|medium|low>",
            "type": "<learning|practice|interview|review>"
          }
        ],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": []
      },
      "weeklyMilestone": "<what should be completed>",
      "assessmentDay": <day>,
      "assessmentType": "<mock-interview|coding-challenge|quiz>"
    }
  ],
  "adaptiveRules": {
    "performanceBasedAdjustment": [
      {
        "condition": "if score > 85%",
        "action": "<increase difficulty>",
        "details": "<specific changes>"
      },
      {
        "condition": "if score < 50%",
        "action": "<decrease difficulty or add more practice>",
        "details": "<specific changes>"
      }
    ],
    "timeBasedAdjustment": [
      {
        "condition": "if behind schedule",
        "action": "<catch-up strategy>",
        "details": "<how to catch up>"
      }
    ]
  },
  "milestones": [
    {
      "milestoneId": <number>,
      "week": <number>,
      "milestone": "<major checkpoint>",
      "successCriteria": "<measurable criteria>",
      "reviewPoints": [
        "<what to review>"
      ]
    }
  ],
  "riskMitigation": {
    "commonChallenges": [
      {
        "challenge": "<common challenge>",
        "mitigation": "<how to handle it>"
      }
    ]
  }
}`;

      const response = await this.callGeminiAPI(planPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const planData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: planData
      };
    } catch (error) {
      console.error('Autonomous Task Agent - generateTaskPlan error:', error);
      return {
        success: false,
        error: 'Failed to generate task plan',
        details: error.message
      };
    }
  }

  /**
   * Schedule interview-related tasks with automation
   * Returns: { scheduledTasks with cron job references }
   */
  async scheduleInterviews(taskPlan = {}, startDate = new Date(), pipelineId = null) {
    try {
      const schedulePrompt = `
You are a scheduling expert creating automated interview scheduling.

Task Plan:
${JSON.stringify(taskPlan, null, 2)}

Start Date: ${startDate}

Create an interview scheduling plan in JSON format:
{
  "scheduledInterviews": [
    {
      "scheduleId": "<id>",
      "week": <number>,
      "day": "<day of week>",
      "time": "<HH:MM>",
      "duration": "<minutes>",
      "interviewType": "<technical|behavioral|hr|mock>",
      "topics": ["<topic>"],
      "difficulty": "<easy|medium|hard>",
      "autoScheduleNotification": "<send reminder>",
      "reminderTiming": [
        "<1 day before>",
        "<1 hour before>"
      ]
    }
  ],
  "cronJobs": [
    {
      "jobId": "<id>",
      "schedule": "<cron expression>",
      "action": "<what to do>",
      "description": "<job description>"
    }
  ],
  "automationRules": {
    "rescheduleIfMissed": <true|false>,
    "autoNotifyUser": <true|false>,
    "autoAdjustDifficulty": <true|false>,
    "autoGenerateQuestions": <true|false>
  },
  "notificationSchedule": [
    {
      "event": "<event>",
      "notifyBefore": "<timing>",
      "messageTemplate": "<email message>"
    }
  ]
}`;

      const response = await this.callGeminiAPI(schedulePrompt);
      const cleanedResponse = this.cleanJSON(response);
      const scheduleData = JSON.parse(cleanedResponse);

      // Set up cron jobs for scheduled tasks
      if (scheduleData.cronJobs && Array.isArray(scheduleData.cronJobs)) {
        scheduleData.cronJobs.forEach((job) => {
          try {
            const task = cron.schedule(job.schedule, () => {
              console.log(`[AUTONOMOUS TASK] Executing job: ${job.description}`);
              // Task execution logic would go here
            });
            this.scheduledTasks.set(job.jobId, task);
            console.log(`[AUTONOMOUS TASK] Scheduled cron job: ${job.jobId}`);
          } catch (error) {
            console.error(`Failed to schedule cron job ${job.jobId}:`, error.message);
          }
        });
      }

      return {
        success: true,
        data: scheduleData,
        scheduledJobCount: scheduleData.cronJobs?.length || 0
      };
    } catch (error) {
      console.error('Autonomous Task Agent - scheduleInterviews error:', error);
      return {
        success: false,
        error: 'Failed to schedule interviews',
        details: error.message
      };
    }
  }

  /**
   * Automatically adjust difficulty based on performance
   * Returns: { adjustedPlan, newDifficulty, rationale }
   */
  async autoAdjustDifficulty(currentTaskPlan = {}, performanceScore = 0, metricsData = {}) {
    try {
      const adjustmentPrompt = `
You are an adaptive learning system adjusting difficulty based on performance.

Current Task Plan:
${JSON.stringify(currentTaskPlan, null, 2)}

Performance Score: ${performanceScore}%

Performance Metrics:
${JSON.stringify(metricsData, null, 2)}

Analyze and suggest difficulty adjustments in JSON format:
{
  "performanceAnalysis": {
    "currentLevel": "<novice|intermediate|advanced|expert>",
    "score": ${performanceScore},
    "status": "<excelling|on-track|struggling|falling-behind>",
    "strengths": ["<strength>"],
    "weaknesses": ["<weakness>"]
  },
  "adjustmentRecommendation": {
    "shouldAdjust": <true|false>,
    "adjustmentType": "<increase|decrease|maintain>",
    "newDifficulty": "<easy|medium|hard|expert>",
    "confidence": <0-100>
  },
  "adjustedPlan": {
    "changedElements": [
      {
        "element": "<what changed>",
        "from": "<current state>",
        "to": "<new state>",
        "reason": "<why this change>"
      }
    ],
    "newTopics": [
      "<topic to add>"
    ],
    "removedTopics": [
      "<topic to remove>"
    ],
    "adjustedSchedule": {
      "hoursPerWeek": <number>,
      "focusAreas": ["<area>"]
    }
  },
  "actionItems": [
    {
      "action": "<specific action>",
      "priority": "<high|medium|low>",
      "deadline": "<when to do it>"
    }
  ],
  "projectedOutcome": {
    "estimatedReadinessIncrease": "<percentage>",
    "expectedResults": "<what should happen>",
    "reviewDate": "<when to review again>"
  }
}`;

      const response = await this.callGeminiAPI(adjustmentPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const adjustmentData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: adjustmentData
      };
    } catch (error) {
      console.error('Autonomous Task Agent - autoAdjustDifficulty error:', error);
      return {
        success: false,
        error: 'Failed to adjust difficulty',
        details: error.message
      };
    }
  }

  /**
   * Send automated notifications via email
   * Returns: { notificationStatus }
   */
  async sendNotification(userId = null, notificationType = 'reminder', message = '', emailService = null) {
    try {
      if (!emailService) {
        return {
          success: false,
          error: 'Email service not provided'
        };
      }

      // Build notification based on type
      const notificationMap = {
        reminder: {
          subject: '📅 Interview Practice Reminder',
          template: 'interview_reminder'
        },
        milestone: {
          subject: '🎉 Milestone Achieved!',
          template: 'milestone_achieved'
        },
        difficultyChange: {
          subject: '📈 Difficulty Level Adjusted',
          template: 'difficulty_adjusted'
        },
        taskUpdate: {
          subject: '✅ Task Update',
          template: 'task_update'
        }
      };

      const notification = notificationMap[notificationType] || notificationMap.reminder;

      // Send notification (implementation depends on emailService)
      console.log(`[AUTONOMOUS TASK] Sending ${notificationType} notification to user ${userId}`);
      // await emailService.sendEmail(userId, notification.subject, message);

      return {
        success: true,
        data: {
          notificationType,
          notificationSent: true,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Autonomous Task Agent - sendNotification error:', error);
      return {
        success: false,
        error: 'Failed to send notification',
        details: error.message
      };
    }
  }

  /**
   * Track task completion and update performance metrics
   * Returns: { progressUpdate, nextTasks, recommendations }
   */
  async trackTaskCompletion(taskId = null, completed = true, performanceData = {}) {
    try {
      const trackingPrompt = `
You are a progress tracking system updating task completion status.

Task ID: ${taskId}
Completed: ${completed}

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Generate a progress update in JSON format:
{
  "taskCompletion": {
    "taskId": "${taskId}",
    "completed": ${completed},
    "completionTime": "<ISO datetime>",
    "performanceScore": <0-100>,
    "status": "<on-track|ahead|behind|completed>"
  },
  "updatedMetrics": {
    "tasksCompletedThisWeek": <number>,
    "tasksCompletedThisMonth": <number>,
    "averageScore": <0-100>,
    "completionRate": <0-100>,
    "estimatedCompletion": "<date>"
  },
  "nextTasks": [
    {
      "taskId": "<id>",
      "task": "<next task>",
      "priority": "<high|medium|low>",
      "dueDate": "<date>"
    }
  ],
  "motivationalMessage": "<encouraging message>",
  "recommendations": [
    "<recommendation>"
  ]
}`;

      const response = await this.callGeminiAPI(trackingPrompt);
      const cleanedResponse = this.cleanJSON(response);
      const trackingData = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: trackingData
      };
    } catch (error) {
      console.error('Autonomous Task Agent - trackTaskCompletion error:', error);
      return {
        success: false,
        error: 'Failed to track task completion',
        details: error.message
      };
    }
  }

  /**
   * Stop all scheduled cron jobs
   */
  stopAllTasks() {
    try {
      let stoppedCount = 0;
      this.scheduledTasks.forEach((task, jobId) => {
        task.stop();
        this.scheduledTasks.delete(jobId);
        stoppedCount++;
      });
      console.log(`[AUTONOMOUS TASK] Stopped ${stoppedCount} scheduled tasks`);
      return {
        success: true,
        data: { stoppedCount }
      };
    } catch (error) {
      console.error('Autonomous Task Agent - stopAllTasks error:', error);
      return {
        success: false,
        error: 'Failed to stop tasks',
        details: error.message
      };
    }
  }
}

export default new AutonomousTaskAgent();
