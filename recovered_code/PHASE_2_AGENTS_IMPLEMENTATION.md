# Phase 2 AI Agents Implementation Guide

## 📋 Overview

Phase 2 implementation adds 3 advanced AI agents to your Placement Simulation app, bringing the total to 6 agents. These agents focus on personalized mentoring, company-specific interview preparation, and autonomous task scheduling.

### Phase 2 Agents

1. **🎓 Mentor Agent** - Personalized learning roadmaps & progress tracking
2. **🏢 Company Simulation Agent** - Company-specific interview customization
3. **⏰ Autonomous Task Agent** - Automated scheduling & difficulty adjustment

## 🔧 Technical Stack

All Phase 2 agents use:

- **API**: Gemini 2.5 Flash (gemini-2.5-flash:generateContent)
- **Rate Limit**: 60 requests/minute (free tier)
- **Language**: Node.js with Axios
- **Pattern**: Same as Phase 1 agents (callGeminiAPI + cleanJSON helpers)
- **New Dependency**: `node-cron` for task scheduling

## 📦 Installation

### 1. Install Dependencies

```bash
cd backend
npm install
# node-cron is now included in package.json
```

### 2. Service Files Created

- `backend/services/mentorAgent.js` ✅
- `backend/services/companySimulationAgent.js` ✅
- `backend/services/autonomousTaskAgent.js` ✅

### 3. Routes Added

All Phase 2 endpoints added to `backend/routes/agents.js`:

- `/api/agents/mentor/*` (5 endpoints)
- `/api/agents/company/*` (5 endpoints)
- `/api/agents/task/*` (6 endpoints)

### 4. Models Extended

- **PlacementSimulation**: Added mentorInsights, companySimulation, autonomousPlanning fields
- **AIInterviewSession**: Added companyContext field for company-specific data
- **Pipeline**: Added scheduledTasks, performanceHistory, difficulty tracking fields

---

## 🎓 Agent 3: Mentor Agent

### Purpose

Analyzes placement simulation performance and generates personalized learning roadmaps with targeted recommendations.

### Service Location

`backend/services/mentorAgent.js`

### Methods

#### 1. `analyzePlacementData(placementData)`

Comprehensive analysis of placement simulation performance.

**Input:**

```javascript
{
  placementData: {
    resume: { score: 75, ... },
    aptitude: { score: 80, correctAnswers: 8, ... },
    coding: { score: 60, codeQuality: {...}, ... },
    technicalInterview: { score: 70, topicsCovered: [...], ... },
    managerialInterview: { score: 65, ... },
    hrInterview: { score: 75, communicationScore: 80, ... }
  }
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    overallPerformance: {
      score: 71,
      percentile: 65,
      readinessLevel: "developing"
    },
    strengths: [
      {
        area: "technical",
        score: 70,
        description: "Good problem-solving approach",
        examples: ["...]
      }
    ],
    weaknesses: [
      {
        area: "communication",
        score: 65,
        severity: "medium",
        description: "Needs to articulate thoughts more clearly"
      }
    ],
    performanceMetrics: {
      technicalScore: 70,
      codingScore: 60,
      communicationScore: 65,
      behavioralScore: 75,
      overallScore: 71
    },
    keyObservations: ["Coding is main weakness", "...]
  }
}
```

**API Endpoint:**

```
POST /api/agents/mentor/analyze-placement
Content-Type: application/json

{
  "placementSimulationId": "63f7a1b2c3d4e5f6g7h8i9j0",
  // OR
  "placementData": { /* full placement data */ }
}
```

#### 2. `generateLearningRoadmap(performanceAnalysis, targetRole)`

Creates an 8-week detailed learning roadmap.

**Input:**

```javascript
{
  performanceAnalysis: {
    strengths: [...],
    weaknesses: [...],
    performanceMetrics: {...}
  },
  targetRole: "Software Engineer" // or other role
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    roadmapTitle: "8-Week Intensive Preparation Program",
    targetRole: "Software Engineer",
    duration: "8 weeks",
    phases: [
      {
        phase: 1,
        phaseName: "Foundation",
        duration: "2 weeks",
        goals: ["Master data structures", "..."],
        topics: [
          {
            topic: "Arrays and Linked Lists",
            priority: "high",
            currentLevel: "intermediate",
            targetLevel: "advanced",
            estimatedHours: 20,
            resources: [
              {
                type: "course",
                name: "LeetCode DSA Masterclass",
                link: "..."
              }
            ]
          }
        ],
        practiceProjects: [...],
        milestones: [...]
      },
      // ... 7 more phases
    ],
    weeklySchedule: {
      hoursPerWeek: 30,
      breakdownByDay: {
        monday: "2 hours theory + 2 hours practice",
        // ...
      }
    },
    assessmentPoints: [...],
    expectedOutcomes: ["..."]
  }
}
```

**API Endpoint:**

```
POST /api/agents/mentor/generate-roadmap
Content-Type: application/json

{
  "performanceAnalysis": { /* from analyzePlacementData */ },
  "targetRole": "Software Engineer"
}
```

#### 3. `generateRecommendations(performanceAnalysis, weaknessAreas)`

Generates actionable immediate recommendations.

**Input:**

```javascript
{
  performanceAnalysis: { ... },
  weaknessAreas: ["Arrays", "System Design", "Communication"]
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    immediateActions: [
      {
        action: "Review binary search algorithms",
        priority: "high",
        timeline: "do this today",
        expectedImpact: "Strengthen weak DSA concepts",
        estimatedTime: "1 hour"
      }
    ],
    resourceRecommendations: [
      {
        resource: "LeetCode Medium Array Problems",
        type: "practice-platform",
        topic: "Arrays",
        estimatedHours: 10,
        difficulty: "medium",
        priority: "must-do",
        link: "https://..."
      }
    ],
    mockInterviewTopics: [
      {
        topic: "Array Manipulation",
        difficulty: "medium",
        focusAreas: ["Two pointer technique", "..."],
        commonQuestions: ["..."],
        preparationTips: ["..."]
      }
    ],
    interviewPreparationPlan: {
      technicalPrep: {...},
      behavioralPrep: {...},
      communicationPrep: {...}
    },
    successMetrics: {
      weeklyGoals: ["..."],
      monthlyTargets: {
        technicalScore: 85,
        communicationScore: 80,
        overallScore: 83
      }
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/mentor/recommendations
Content-Type: application/json

{
  "performanceAnalysis": { /* from analyzePlacementData */ },
  "weaknessAreas": ["Arrays", "System Design"]
}
```

#### 4. `trackProgress(roadmapId, completedTasks, currentScores)`

Track progress on learning roadmap and suggest adjustments.

**Input:**

```javascript
{
  roadmapId: "roadmap_12345",
  completedTasks: [
    { taskId: "t1", completedAt: "2024-01-28" },
    { taskId: "t2", completedAt: "2024-01-28" }
  ],
  currentScores: {
    technicalScore: 75,
    codingScore: 65,
    communicationScore: 70
  }
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    progressScore: 72,
    completionPercentage: 35,
    paceAssessment: "on-track",
    completedMilestones: [
      {
        milestone: "Master Arrays",
        completionDate: "2024-01-28",
        performance: "met",
        feedback: "Good improvement"
      }
    ],
    nextSteps: [...],
    roadmapAdjustments: [...],
    motivationalInsights: ["You're making great progress!"],
    projectedOutcome: {
      estimatedReadiness: "78%",
      likelyOutcome: "Senior Software Engineer",
      confidence: "high"
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/mentor/track-progress
Content-Type: application/json

{
  "roadmapId": "roadmap_12345",
  "completedTasks": [{ taskId: "t1" }],
  "currentScores": { technicalScore: 75 }
}
```

---

## 🏢 Agent 4: Company Simulation Agent

### Purpose

Creates company-specific interview profiles and generates customized questions, interview flows, and culture fit analysis.

### Service Location

`backend/services/companySimulationAgent.js`

### Methods

#### 1. `createCompanyProfile(companyName, industry, companySize, jobRole)`

Creates comprehensive company interview profile.

**Input:**

```javascript
{
  companyName: "Google",
  industry: "Technology",
  companySize: "large",
  jobRole: "Software Engineer"
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    companyProfile: {
      name: "Google",
      industry: "Technology",
      size: "large",
      culture: {
        description: "Innovative, data-driven, collaborative",
        values: ["Innovation", "User focus", "Excellence", "Integrity"],
        workStyle: "hybrid",
        teamDynamics: "Cross-functional, autonomous teams"
      },
      knownForChallenges: ["System design", "Algorithmic thinking"],
      interviewStyle: "collaborative"
    },
    interviewFormat: {
      totalRounds: 4,
      roundSequence: [
        {
          round: 1,
          name: "Phone Screen",
          duration: "45 minutes",
          interviewType: "phone",
          focusAreas: ["Data structures", "Basic algorithms"],
          questionCount: 2,
          difficulty: "medium"
        },
        // ... more rounds
      ]
    },
    cultureFitFactors: {
      importantTraits: ["Leadership", "Collaboration", "..."],
      dealBreakers: ["Dishonesty"],
      greenFlags: ["Growth mindset"],
      evaluationCriteria: {...}
    },
    roleExpectations: {...},
    interviewTips: {...}
  }
}
```

**API Endpoint:**

```
POST /api/agents/company/create-profile
Content-Type: application/json

{
  "companyName": "Google",
  "industry": "Technology",
  "companySize": "large",
  "jobRole": "Software Engineer"
}
```

#### 2. `generateCompanyQuestions(companyProfile, questionCount, difficulty)`

Generates company-aligned technical questions.

**Input:**

```javascript
{
  companyProfile: { /* from createCompanyProfile */ },
  questionCount: 5,
  difficulty: "medium"
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    questions: [
      {
        id: 1,
        question: "Design a distributed cache system",
        category: "system-design",
        difficulty: "medium",
        estimatedTime: "45 minutes",
        context: "Google uses caching extensively in their infrastructure",
        hints: ["Think about consistency models", "..."],
        evaluationCriteria: {
          "System understanding": { weight: 30, description: "..." },
          "Trade-offs analysis": { weight: 25, description: "..." }
        },
        goodAnswerExamples: [...],
        redFlags: ["Ignoring consistency issues"],
        greenFlags: ["Mentions CAP theorem"],
        followUpQuestions: ["..."]
      }
    ],
    assessmentGuidelines: {
      excellentScore: { threshold: "85-100", indicators: ["..."] },
      goodScore: { threshold: "70-84", indicators: ["..."] }
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/company/generate-questions
Content-Type: application/json

{
  "companyProfile": { /* company profile data */ },
  "questionCount": 5,
  "difficulty": "medium"
}
```

#### 3. `generateBehavioralQuestions(companyProfile, questionCount)`

Generates company-culture-aligned behavioral questions.

**Input:**

```javascript
{
  companyProfile: { /* from createCompanyProfile */ },
  questionCount: 4
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    behavioralQuestions: [
      {
        id: 1,
        question: "Tell about a time you disagreed with your team on technical approach",
        alignedValue: "Collaboration",
        category: "teamwork",
        evaluationFocus: ["Communication", "Respect for others"],
        expectedAnswerStructure: {
          situation: "Describe the situation",
          task: "Your responsibility",
          action: "What you did",
          result: "Outcome"
        },
        greenFlags: ["Listened to others", "Found common ground"],
        redFlags: ["Was dismissive"],
        cultureAlignment: {
          factor: "Tests collaborative problem-solving",
          importance: "critical"
        }
      }
    ]
  }
}
```

**API Endpoint:**

```
POST /api/agents/company/behavioral-questions
Content-Type: application/json

{
  "companyProfile": { /* company profile data */ },
  "questionCount": 4
}
```

#### 4. `customizeInterviewFlow(companyProfile, candidateLevel)`

Customizes entire interview flow based on company and candidate.

**Input:**

```javascript
{
  companyProfile: { /* from createCompanyProfile */ },
  candidateLevel: "mid-level"
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    interviewStrategy: {
      overall_approach: "Test system design and soft skills",
      emphasis: {
        technical: 40,
        behavioral: 30,
        cultureFit: 20,
        systemDesign: 60,
        communication: 50
      }
    },
    customizedFlow: [
      {
        round: 1,
        name: "Phone Screen",
        duration: "45",
        objectives: ["Verify basics", "..."],
        questionDistribution: { algorithms: 2, design: 0 },
        difficulty: "medium",
        evaluationWeight: 10,
        adaptiveStrategy: {
          ifAnswerWell: "Increase difficulty",
          ifAnswerPoorly: "Provide hints"
        }
      }
    ],
    scoringWeights: {
      technical: 40,
      communication: 25,
      problemSolving: 20,
      cultureFit: 15
    },
    passFailCriteria: {
      minimumScore: 70,
      criticalAreas: [
        {
          area: "System Design",
          minimumRequired: 60,
          rationale: "Core skill at Google"
        }
      ]
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/company/customize-flow
Content-Type: application/json

{
  "companyProfile": { /* company profile data */ },
  "candidateLevel": "mid-level"
}
```

#### 5. `analyzeCompanyFit(companyProfile, candidateResponses)`

Analyzes cultural and role fit.

**Input:**

```javascript
{
  companyProfile: { /* from createCompanyProfile */ },
  candidateResponses: [
    { question: "...", answer: "..." },
    // ... more responses
  ]
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    companyFitScore: 82,
    cultureFitScore: 85,
    roleFitScore: 78,
    overallFitLevel: "good",
    cultureFitAnalysis: {
      alignedValues: [
        {
          value: "Innovation",
          candidateAlignment: 90,
          evidence: "Mentioned novel approach"
        }
      ],
      misalignedValues: [],
      workStyleMatch: { score: 80, assessment: "..." }
    },
    roleReadiness: {
      technicalReadiness: 75,
      communicationReadiness: 85,
      leadershipReadiness: 70,
      overallReadiness: 77
    },
    recommendations: {
      proceed: true,
      nextSteps: ["Schedule round 2"],
      areasToImprove: ["System design knowledge"],
      strengths: ["Great communication"]
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/company/analyze-fit
Content-Type: application/json

{
  "companyProfile": { /* company profile data */ },
  "candidateResponses": [{ question: "...", answer: "..." }]
}
```

---

## ⏰ Agent 5: Autonomous Task Agent

### Purpose

Generates adaptive task plans, schedules interviews with automation, and adjusts difficulty based on performance.

### Service Location

`backend/services/autonomousTaskAgent.js`

### Methods

#### 1. `generateTaskPlan(userData, performanceData, targetGoal)`

Generates 8-week adaptive task plan with daily tasks.

**Input:**

```javascript
{
  userData: {
    name: "John Doe",
    targetRole: "Senior Engineer",
    yearsExperience: 3
  },
  performanceData: {
    technicalScore: 70,
    communicationScore: 65,
    currentLevel: "intermediate"
  },
  targetGoal: "placement"
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    planOverview: {
      totalDuration: "8 weeks",
      startDate: "2024-01-29",
      targetGoal: "placement",
      estimatedHoursRequired: 240,
      difficulty: "intermediate"
    },
    weeklyBreakdown: [
      {
        week: 1,
        theme: "Foundation & Assessment",
        duration: "7 days",
        objectives: ["Assess current level", "..."],
        dailyTasks: {
          monday: [
            {
              taskId: "w1_mon_1",
              task: "Review arrays and linked lists",
              estimatedTime: "120",
              priority: "high",
              type: "learning"
            },
            {
              taskId: "w1_mon_2",
              task: "Solve 3 easy LeetCode problems",
              estimatedTime: "90",
              priority: "high",
              type: "practice"
            }
          ],
          tuesday: [...],
          // ... rest of week
        },
        weeklyMilestone: "Complete assessment and plan first focus area",
        assessmentDay: 7,
        assessmentType: "coding-challenge"
      },
      // ... 7 more weeks
    ],
    adaptiveRules: [
      {
        condition: "if score > 85%",
        action: "increase difficulty",
        details: "Move to hard problems next week"
      },
      {
        condition: "if score < 50%",
        action: "decrease difficulty or add more practice",
        details: "Repeat medium problems, add tutorials"
      }
    ],
    milestones: [
      {
        milestoneId: 1,
        week: 2,
        milestone: "Master Data Structures",
        successCriteria: "Score 80%+ on DSA assessment",
        reviewPoints: ["Understand time/space complexity"]
      }
    ],
    riskMitigation: [
      {
        challenge: "Procrastination",
        mitigation: "Daily notifications and accountability"
      }
    ]
  }
}
```

**API Endpoint:**

```
POST /api/agents/task/generate-plan
Content-Type: application/json

{
  "userData": { name: "John", targetRole: "Engineer" },
  "performanceData": { technicalScore: 70 },
  "targetGoal": "placement"
}
```

#### 2. `scheduleInterviews(taskPlan, startDate, pipelineId)`

Schedules interviews with cron job automation.

**Input:**

```javascript
{
  taskPlan: { /* from generateTaskPlan */ },
  startDate: "2024-01-29",
  pipelineId: "pipeline_123"
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    scheduledInterviews: [
      {
        scheduleId: "int_1",
        week: 2,
        day: "Friday",
        time: "14:00",
        duration: 45,
        interviewType: "mock",
        topics: ["Arrays", "Linked Lists"],
        difficulty: "medium",
        autoScheduleNotification: "send reminder",
        reminderTiming: ["1 day before", "1 hour before"]
      }
    ],
    cronJobs: [
      {
        jobId: "cron_1",
        schedule: "0 14 * * 5",
        action: "Generate interview questions",
        description: "Friday 2 PM: Generate weekly mock interview"
      }
    ],
    automationRules: {
      rescheduleIfMissed: true,
      autoNotifyUser: true,
      autoAdjustDifficulty: true,
      autoGenerateQuestions: true
    },
    notificationSchedule: [
      {
        event: "Interview scheduled",
        notifyBefore: "1 day",
        messageTemplate: "Your mock interview is scheduled..."
      }
    ]
  },
  scheduledJobCount: 8
}
```

**API Endpoint:**

```
POST /api/agents/task/schedule-interviews
Content-Type: application/json

{
  "taskPlan": { /* task plan data */ },
  "startDate": "2024-01-29",
  "pipelineId": "pipeline_123"
}
```

#### 3. `autoAdjustDifficulty(currentTaskPlan, performanceScore, metricsData)`

Automatically adjusts difficulty based on performance.

**Input:**

```javascript
{
  currentTaskPlan: { /* current task plan */ },
  performanceScore: 72,
  metricsData: {
    problemsSolved: 15,
    averageScore: 72,
    weakAreas: ["System Design"],
    strongAreas: ["Arrays"]
  }
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    performanceAnalysis: {
      currentLevel: "intermediate",
      score: 72,
      status: "on-track",
      strengths: ["Arrays", "Quick learner"],
      weaknesses: ["System design", "Communication"]
    },
    adjustmentRecommendation: {
      shouldAdjust: true,
      adjustmentType: "increase",
      newDifficulty: "hard",
      confidence: 85
    },
    adjustedPlan: {
      changedElements: [
        {
          element: "Problem difficulty",
          from: "medium",
          to: "hard",
          reason: "Performance suggests readiness"
        }
      ],
      newTopics: ["Distributed Systems", "..."],
      removedTopics: [],
      adjustedSchedule: {
        hoursPerWeek: 35,
        focusAreas: ["System Design"]
      }
    },
    actionItems: [
      {
        action: "Start system design problems",
        priority: "high",
        deadline: "Next week"
      }
    ],
    projectedOutcome: {
      estimatedReadinessIncrease: "8%",
      expectedResults: "Score >80 in 2 weeks",
      reviewDate: "2024-02-11"
    }
  }
}
```

**API Endpoint:**

```
POST /api/agents/task/adjust-difficulty
Content-Type: application/json

{
  "currentTaskPlan": { /* current task plan */ },
  "performanceScore": 72,
  "metricsData": { /* performance metrics */ }
}
```

#### 4. `trackTaskCompletion(taskId, completed, performanceData)`

Track task completion and update metrics.

**Input:**

```javascript
{
  taskId: "w1_mon_1",
  completed: true,
  performanceData: {
    timeSpent: 125,
    estimatedTime: 120,
    qualityScore: 85,
    conceptsLearned: ["Array manipulation", "..."]
  }
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    taskCompletion: {
      taskId: "w1_mon_1",
      completed: true,
      completionTime: "2024-01-29T14:30:00Z",
      performanceScore: 85,
      status: "on-track"
    },
    updatedMetrics: {
      tasksCompletedThisWeek: 3,
      tasksCompletedThisMonth: 12,
      averageScore: 82,
      completionRate: 95,
      estimatedCompletion: "2024-03-26"
    },
    nextTasks: [
      {
        taskId: "w1_tue_1",
        task: "Practice linked list problems",
        priority: "high",
        dueDate: "2024-01-30"
      }
    ],
    motivationalMessage: "Great progress! Keep it up!",
    recommendations: ["Focus on system design next"]
  }
}
```

**API Endpoint:**

```
POST /api/agents/task/track-completion
Content-Type: application/json

{
  "taskId": "w1_mon_1",
  "completed": true,
  "performanceData": { /* performance metrics */ }
}
```

#### 5. `sendNotification(userId, notificationType, message, emailService)`

Send automated notifications.

**Notification Types:**

- `reminder` - Interview/task reminder
- `milestone` - Milestone achievement
- `difficultyChange` - Difficulty adjustment notification
- `taskUpdate` - Task status update

**Input:**

```javascript
{
  userId: "user_123",
  notificationType: "reminder",
  message: "Your mock interview is in 1 hour",
  emailService: emailServiceInstance
}
```

**Output:**

```javascript
{
  success: true,
  data: {
    notificationType: "reminder",
    notificationSent: true,
    timestamp: "2024-01-29T13:00:00Z"
  }
}
```

**API Endpoint:**

```
POST /api/agents/task/send-notification
Content-Type: application/json

{
  "userId": "user_123",
  "notificationType": "reminder",
  "message": "Your mock interview is in 1 hour"
}
```

---

## 🎨 Frontend Integration (Next Steps)

### Recommended Components to Update

1. **Dashboard Component** - Add Phase 2 agent outputs
   - Display mentor recommendations
   - Show company fit scores
   - List scheduled tasks

2. **PlacementSimulation Component** - Integrate agents
   - Call mentor agent after completion
   - Show learning roadmap
   - Display company-specific interview option

3. **New Components to Create**
   - `MentorDashboard.tsx` - Learning roadmap visualization
   - `CompanySimulationSetup.tsx` - Company selection and customization
   - `TaskScheduler.tsx` - Task calendar and progress tracking

### Console Logging Pattern (Like Phase 1)

```javascript
// After calling Phase 2 agent endpoints, add console logging:
console.group(
  "%c🎓 MENTOR AGENT ANALYSIS",
  "color: #9c27b0; font-weight: bold; font-size: 14px",
);
console.log(
  "%cPerformance Analysis:",
  "color: #9c27b0; font-weight: bold",
  analysis,
);
console.table(performanceMetrics);
console.groupEnd();

console.group(
  "%c🏢 COMPANY SIMULATION SETUP",
  "color: #2196f3; font-weight: bold; font-size: 14px",
);
console.log("%cCompany Profile:", "color: #2196f3; font-weight: bold", profile);
console.log(
  "%cCulture Fit Score:",
  "color: #00aa00; font-weight: bold",
  fitScore,
);
console.groupEnd();

console.group(
  "%c⏰ AUTONOMOUS TASK PLAN",
  "color: #ff9800; font-weight: bold; font-size: 14px",
);
console.table(weeklyBreakdown);
console.log("%cScheduled Jobs:", "color: #ff9800; font-weight: bold", cronJobs);
console.groupEnd();
```

---

## 🧪 Testing the Agents

### 1. Test Mentor Agent

```bash
curl -X POST http://localhost:5000/api/agents/mentor/analyze-placement \
  -H "Content-Type: application/json" \
  -d '{
    "placementData": {
      "resume": {"score": 75},
      "aptitude": {"score": 80},
      "coding": {"score": 60},
      "technicalInterview": {"score": 70},
      "managerialInterview": {"score": 65},
      "hrInterview": {"score": 75}
    }
  }'
```

### 2. Test Company Simulation Agent

```bash
curl -X POST http://localhost:5000/api/agents/company/create-profile \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Google",
    "industry": "Technology",
    "companySize": "large",
    "jobRole": "Software Engineer"
  }'
```

### 3. Test Autonomous Task Agent

```bash
curl -X POST http://localhost:5000/api/agents/task/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {"name": "John", "targetRole": "Engineer"},
    "performanceData": {"technicalScore": 70},
    "targetGoal": "placement"
  }'
```

---

## 📊 API Summary

### Mentor Agent Endpoints (5)

| Method | Endpoint                               | Purpose                   |
| ------ | -------------------------------------- | ------------------------- |
| POST   | `/api/agents/mentor/analyze-placement` | Analyze placement data    |
| POST   | `/api/agents/mentor/generate-roadmap`  | Generate learning roadmap |
| POST   | `/api/agents/mentor/recommendations`   | Get recommendations       |
| POST   | `/api/agents/mentor/track-progress`    | Track progress            |

### Company Simulation Endpoints (5)

| Method | Endpoint                                   | Purpose                       |
| ------ | ------------------------------------------ | ----------------------------- |
| POST   | `/api/agents/company/create-profile`       | Create company profile        |
| POST   | `/api/agents/company/generate-questions`   | Generate tech questions       |
| POST   | `/api/agents/company/behavioral-questions` | Generate behavioral questions |
| POST   | `/api/agents/company/customize-flow`       | Customize interview flow      |
| POST   | `/api/agents/company/analyze-fit`          | Analyze culture fit           |

### Autonomous Task Endpoints (6)

| Method | Endpoint                               | Purpose                  |
| ------ | -------------------------------------- | ------------------------ |
| POST   | `/api/agents/task/generate-plan`       | Generate 8-week plan     |
| POST   | `/api/agents/task/schedule-interviews` | Schedule with automation |
| POST   | `/api/agents/task/adjust-difficulty`   | Auto-adjust difficulty   |
| POST   | `/api/agents/task/track-completion`    | Track task completion    |
| POST   | `/api/agents/task/send-notification`   | Send notifications       |

---

## 🚀 Next Steps

1. **Backend Testing** (Current Phase)
   - Test all endpoints with curl or Postman
   - Verify Gemini API integration
   - Check cron job scheduling

2. **Frontend Integration** (Next)
   - Create UI components for each agent
   - Add console logging like Phase 1
   - Integrate with PlacementSimulation flow

3. **Database Integration**
   - Save mentor roadmaps
   - Store company profiles
   - Track task completions

4. **Production Deployment**
   - Environment variable setup
   - Error handling & logging
   - Rate limiting

---

## 📝 Notes

- All agents use **Gemini 2.5 Flash** for consistency with Phase 1
- **node-cron** provides cron job functionality (already in package.json)
- Models are backward compatible with existing data
- All endpoints follow same error handling pattern as Phase 1
- Console logging can be added to frontend components for debugging

---

## ❓ Troubleshooting

### Agent Returns Empty Response

- Check GEMINI_API_KEY environment variable
- Verify internet connection
- Check API quota

### Cron Jobs Not Running

- Verify node-cron dependency is installed
- Check server logs for scheduling errors
- Restart backend service

### Database Errors

- Verify MongoDB connection
- Check schema compatibility
- Review model definitions

---

## 📞 Support

For issues or questions, refer to:

- Phase 1 Agent Documentation (interviewerAgent, codingEvaluatorAgent, hrBehaviorAgent)
- Gemini API Documentation
- Node-cron Documentation

---

**Status**: ✅ Phase 2 Complete & Ready for Testing
**Last Updated**: January 28, 2024
**Agents Implemented**: 6/7 (Phases 1 & 2)
**Remaining**: Phase 3 (1 agent - TBD)
