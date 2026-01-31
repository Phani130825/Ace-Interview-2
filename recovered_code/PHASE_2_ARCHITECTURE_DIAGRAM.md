# 🎯 Phase 2 Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PlacementSimulation.tsx                                         │
│  ├─ User completes all 6 interview rounds                        │
│  ├─ currentView = "analytics"                                    │
│  ├─ useEffect triggers → callPhase2Agents()                      │
│  └─ Displays 3 insight cards                                     │
│                                                                   │
│  Imports:                                                         │
│  ├─ mentorAPI from api.js                                        │
│  ├─ companyAPI from api.js                                       │
│  └─ taskAPI from api.js                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓↓↓ API Calls ↓↓↓
┌─────────────────────────────────────────────────────────────────┐
│                     API Service Layer (api.js)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  mentorAPI                          companyAPI                   │
│  ├─ analyzePlacement ────┐          ├─ createProfile ────────┐  │
│  ├─ generateRoadmap      │          ├─ generateQuestions     │  │
│  ├─ getRecommendations   │          ├─ generateBehavioral    │  │
│  └─ trackProgress        │          ├─ customizeFlow         │  │
│                          │          └─ analyzeFit            │  │
│                   taskAPI│                           │        │  │
│                   ├─ generatePlan ─────────────────────────────┤  │
│                   ├─ scheduleInterviews                        │  │
│                   ├─ adjustDifficulty                          │  │
│                   ├─ trackCompletion                           │  │
│                   └─ sendNotification                          │  │
│                                                                 │  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↓↓ POST Requests ↓↓↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js + Node)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  server.js (Line 112)                                            │
│  └─ app.use('/api/agents', authenticateToken, agentRoutes)      │
│                                                                   │
│  backend/routes/agents.js (1008 lines)                          │
│  ├─ Phase 1 Agents: 3 agents, 12 endpoints ✅                  │
│  └─ Phase 2 Agents: 3 agents, 16 endpoints ✅                  │
│                                                                   │
│  Endpoints:                                                       │
│  ├─ POST /api/agents/mentor/analyze-placement                   │
│  ├─ POST /api/agents/mentor/generate-roadmap                    │
│  ├─ POST /api/agents/mentor/recommendations                     │
│  ├─ POST /api/agents/mentor/track-progress                      │
│  │                                                                │
│  ├─ POST /api/agents/company/create-profile                     │
│  ├─ POST /api/agents/company/generate-questions                 │
│  ├─ POST /api/agents/company/behavioral-questions               │
│  ├─ POST /api/agents/company/customize-flow                     │
│  ├─ POST /api/agents/company/analyze-fit                        │
│  │                                                                │
│  ├─ POST /api/agents/task/generate-plan                         │
│  ├─ POST /api/agents/task/schedule-interviews                   │
│  ├─ POST /api/agents/task/adjust-difficulty                     │
│  ├─ POST /api/agents/task/track-completion                      │
│  └─ POST /api/agents/task/send-notification                     │
│                                                                   │
│  Agent Services:                                                  │
│  ├─ mentorAgent.js (393 lines)                                  │
│  ├─ companySimulationAgent.js (450+ lines)                      │
│  └─ autonomousTaskAgent.js (500+ lines)                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                         ↓↓↓ Agent Processing ↓↓↓
┌─────────────────────────────────────────────────────────────────┐
│               AI Models (Gemini API Integration)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Model: gemini-2.5-flash                                        │
│                                                                   │
│  Processing:                                                      │
│  ├─ Mentor: Analyzes performance → generates learning roadmap  │
│  ├─ Company: Creates profile → calculates company fit          │
│  └─ Task: Generates tasks → schedules interviews               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓↓↓ Responses ↓↓↓
┌─────────────────────────────────────────────────────────────────┐
│              Database (MongoDB + Models)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PlacementSimulation                                             │
│  ├─ mentorInsights (NEW)                                         │
│  ├─ companySimulation (NEW)                                      │
│  └─ autonomousPlanning (NEW)                                     │
│                                                                   │
│  AIInterviewSession                                              │
│  └─ companyContext (NEW)                                         │
│                                                                   │
│  Pipeline                                                         │
│  ├─ scheduledTasks (NEW)                                         │
│  └─ currentDifficulty (NEW)                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↑↑↑ Data Flow ↑↑↑
```

---

## Detailed Request-Response Flow

### 1️⃣ Mentor Agent Flow

```
Frontend Request:
┌─────────────────────────────────┐
│ POST /api/agents/mentor/        │
│ analyze-placement               │
│ ├─ userId                       │
│ ├─ simulationId                 │
│ ├─ overallScore                 │
│ ├─ steps: [...]                 │
│ ├─ resumeData                   │
│ └─ performance                  │
└─────────────────────────────────┘
           ↓
Backend Processing:
┌─────────────────────────────────┐
│ mentorAgent.analyzePlacementData│
│ ├─ Input: simulationData        │
│ ├─ Gemini API call              │
│ └─ Model: gemini-2.5-flash      │
└─────────────────────────────────┘
           ↓
Frontend Response:
┌─────────────────────────────────┐
│ {                               │
│   success: true,                │
│   data: {                       │
│     performanceAnalysis: "...", │
│     learningRoadmap: "...",     │
│     recommendations: "...",     │
│     progressTracking: "..."     │
│   }                             │
│ }                               │
└─────────────────────────────────┘
           ↓
Frontend Display:
┌─────────────────────────────────┐
│ Blue/Cyan Card                  │
│ 📚 Mentor Agent Insights        │
│ ├─ Performance Analysis         │
│ ├─ Learning Roadmap             │
│ └─ Recommendations              │
└─────────────────────────────────┘
```

### 2️⃣ Company Simulation Agent Flow

```
Frontend Request:
┌─────────────────────────────────┐
│ POST /api/agents/company/       │
│ create-profile                  │
│ ├─ userId                       │
│ ├─ simulationId                 │
│ ├─ overallScore                 │
│ ├─ steps: [...]                 │
│ ├─ resumeData                   │
│ └─ performance                  │
└─────────────────────────────────┘
           ↓
Backend Processing:
┌─────────────────────────────────┐
│ companyAgent.createCompanyProfile
│ ├─ Input: simulationData        │
│ ├─ Gemini API call              │
│ └─ Model: gemini-2.5-flash      │
└─────────────────────────────────┘
           ↓
Frontend Response:
┌─────────────────────────────────┐
│ {                               │
│   success: true,                │
│   data: {                       │
│     companyProfile: "...",      │
│     fitAnalysis: "...",         │
│     recommendations: "..."      │
│   }                             │
│ }                               │
└─────────────────────────────────┘
           ↓
Frontend Display:
┌─────────────────────────────────┐
│ Green/Emerald Card              │
│ 🏢 Company Insights             │
│ ├─ Company Profile              │
│ ├─ Your Fit Analysis            │
│ └─ Improvement Areas            │
└─────────────────────────────────┘
```

### 3️⃣ Autonomous Task Agent Flow

```
Frontend Request:
┌─────────────────────────────────┐
│ POST /api/agents/task/          │
│ generate-plan                   │
│ ├─ userId                       │
│ ├─ simulationId                 │
│ ├─ overallScore                 │
│ ├─ steps: [...]                 │
│ ├─ resumeData                   │
│ └─ performance                  │
└─────────────────────────────────┘
           ↓
Backend Processing:
┌─────────────────────────────────┐
│ taskAgent.generateTaskPlan      │
│ ├─ Input: simulationData        │
│ ├─ Gemini API call              │
│ └─ Model: gemini-2.5-flash      │
└─────────────────────────────────┘
           ↓
Frontend Response:
┌─────────────────────────────────┐
│ {                               │
│   success: true,                │
│   data: {                       │
│     taskPlan: "...",            │
│     schedule: "...",            │
│     nextSteps: "..."            │
│   }                             │
│ }                               │
└─────────────────────────────────┘
           ↓
Frontend Display:
┌─────────────────────────────────┐
│ Purple/Pink Card                │
│ 📋 Task Plan Insights           │
│ ├─ Recommended Tasks            │
│ ├─ Suggested Schedule           │
│ └─ Next Steps                   │
└─────────────────────────────────┘
```

---

## Component Lifecycle

```
User Starts Simulation
        ↓
┌──────────────────────────────┐
│ PlacementSimulation Component│
│ - State initialized          │
│ - currentView: "overview"    │
│ - agentInsights: null        │
│ - agentLoading: false        │
└──────────────────────────────┘
        ↓
User Completes All 6 Rounds
        ↓
┌──────────────────────────────┐
│ Backend Updates Simulation   │
│ status: "completed"          │
│ currentStep: 6               │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ Frontend Sets currentView    │
│ currentView: "analytics"     │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ useEffect Hook Triggers      │
│ if (currentView === "analytics"
│   && simulation
│   && !agentInsights)         │
│ → callPhase2Agents()         │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ agentLoading: true           │
│ Shows spinner                │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ Sequential Agent Calls:      │
│ 1. mentorAPI.analyzePlacement
│ 2. companyAPI.createProfile  │
│ 3. taskAPI.generatePlan      │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ Response Handling            │
│ ├─ Store in agentInsights    │
│ ├─ Log to console            │
│ └─ Update state              │
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│ agentLoading: false          │
│ Render insight cards         │
└──────────────────────────────┘
        ↓
Display Three Cards:
├─ 📚 Mentor Insights (Blue)
├─ 🏢 Company Insights (Green)
└─ 📋 Task Insights (Purple)
```

---

## Data Model Structure

```
PlacementSimulation Document
{
  _id: ObjectId,
  userId: String,
  status: "completed",
  currentStep: 6,
  overallScore: Number,

  // Phase 1 Data
  aptitude: {...},
  coding: {...},
  technicalInterview: {...},
  managerialInterview: {...},
  hrInterview: {...},

  // Phase 2 Data (NEW)
  mentorInsights: {
    performanceAnalysis: String,
    learningRoadmap: String,
    recommendations: String,
    progressTracking: String
  },
  companySimulation: {
    companyProfile: String,
    fitAnalysis: String,
    recommendations: String
  },
  autonomousPlanning: {
    taskPlan: String,
    schedule: String,
    nextSteps: String
  },

  // Resume
  resumeData: {...},

  // Performance tracking
  performance: {...},

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Call Sequence

```
Timeline:

T0: User completes simulation
    └─ POST /placement-simulation/complete

T1: Frontend loads analytics view
    └─ Simulation data available in state

T2: useEffect triggers
    └─ callPhase2Agents() starts

T3-T5: Sequential API Calls
    ├─ T3: POST /api/agents/mentor/analyze-placement
    │       └─ Response: mentor insights
    ├─ T4: POST /api/agents/company/create-profile
    │       └─ Response: company insights
    └─ T5: POST /api/agents/task/generate-plan
            └─ Response: task insights

T6: All responses received
    └─ agentInsights state updated

T7: Components re-render
    └─ Three insight cards displayed

T8: User can view insights
    └─ Interact with cards, scroll, etc.
```

---

## Summary

**Total Flow**:

- 1 component (PlacementSimulation.tsx)
- 3 API methods (mentorAPI, companyAPI, taskAPI)
- 3 backend endpoints (3 active agent calls)
- 3 AI models (Gemini API calls)
- 3 response cards (analytics view)

**Integration Points**: 4

1. Component imports APIs
2. useEffect triggers agents
3. Agents call backend endpoints
4. Results displayed in cards

**Status**: ✅ COMPLETE AND FUNCTIONAL
