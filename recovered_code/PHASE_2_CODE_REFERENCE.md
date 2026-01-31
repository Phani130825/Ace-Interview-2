# 🔗 Phase 2 Integration - Code Reference

## Quick Code Snippets

### 1. API Service Layer (src/services/api.js)

```javascript
// Mentor Agent API
export const mentorAPI = {
  analyzePlacement: (data) =>
    api.post("/agents/mentor/analyze-placement", data),
  generateRoadmap: (data) => api.post("/agents/mentor/generate-roadmap", data),
  getRecommendations: (data) =>
    api.post("/agents/mentor/recommendations", data),
  trackProgress: (data) => api.post("/agents/mentor/track-progress", data),
};

// Company Simulation Agent API
export const companyAPI = {
  createProfile: (data) => api.post("/agents/company/create-profile", data),
  generateQuestions: (data) =>
    api.post("/agents/company/generate-questions", data),
  generateBehavioralQuestions: (data) =>
    api.post("/agents/company/behavioral-questions", data),
  customizeFlow: (data) => api.post("/agents/company/customize-flow", data),
  analyzeFit: (data) => api.post("/agents/company/analyze-fit", data),
};

// Autonomous Task Agent API
export const taskAPI = {
  generatePlan: (data) => api.post("/agents/task/generate-plan", data),
  scheduleInterviews: (data) =>
    api.post("/agents/task/schedule-interviews", data),
  adjustDifficulty: (data) => api.post("/agents/task/adjust-difficulty", data),
  trackCompletion: (data) => api.post("/agents/task/track-completion", data),
  sendNotification: (data) => api.post("/agents/task/send-notification", data),
};
```

---

### 2. Component Imports (PlacementSimulation.tsx)

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Target,
  Code,
  Video,
  Briefcase,
  Users,
  CheckCircle,
  ArrowRight,
  Trophy,
  Clock,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import api, { mentorAPI, companyAPI, taskAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import SimulationAptitude from "./simulation/SimulationAptitude";
import SimulationCoding from "./simulation/SimulationCoding";
import SimulationInterview from "./simulation/SimulationInterview";
```

---

### 3. State Management

```typescript
const { user } = useAuth();
const [simulation, setSimulation] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [currentView, setCurrentView] = useState<string>("overview");
const [agentInsights, setAgentInsights] = useState<any>(null);
const [agentLoading, setAgentLoading] = useState(false);

// Step-specific states
const [resumeText, setResumeText] = useState("");
const [stepLoading, setStepLoading] = useState(false);
```

---

### 4. Auto-trigger Hook

```typescript
// Call Phase 2 agents when analytics view is loaded
useEffect(() => {
  if (currentView === "analytics" && simulation && !agentInsights) {
    callPhase2Agents();
  }
}, [currentView, simulation]);
```

---

### 5. Agent Calling Function

```typescript
const callPhase2Agents = async () => {
  if (!simulation || agentLoading) return;

  try {
    setAgentLoading(true);
    const insights: any = {};

    // Prepare simulation data for agents
    const simulationData = {
      userId: user?.id,
      simulationId: simulation._id,
      overallScore: simulation.overallScore,
      steps: simulation.steps,
      resumeData: simulation.resumeData,
      performance: simulation.performance,
    };

    // Call Mentor Agent for learning insights
    try {
      console.log("📚 Calling Mentor Agent - Analyzing Placement Data");
      const mentorResponse = await mentorAPI.analyzePlacement(simulationData);
      if (mentorResponse.data.success) {
        insights.mentor = mentorResponse.data.data;
        console.log("✅ Mentor insights received:", mentorResponse.data.data);
      }
    } catch (error) {
      console.error("❌ Mentor Agent error:", error);
    }

    // Call Company Simulation Agent for company profile
    try {
      console.log("🏢 Calling Company Simulation Agent - Creating Profile");
      const companyResponse = await companyAPI.createProfile(simulationData);
      if (companyResponse.data.success) {
        insights.company = companyResponse.data.data;
        console.log("✅ Company profile received:", companyResponse.data.data);
      }
    } catch (error) {
      console.error("❌ Company Agent error:", error);
    }

    // Call Task Agent for task planning
    try {
      console.log("📋 Calling Task Agent - Generating Task Plan");
      const taskResponse = await taskAPI.generatePlan(simulationData);
      if (taskResponse.data.success) {
        insights.task = taskResponse.data.data;
        console.log("✅ Task plan received:", taskResponse.data.data);
      }
    } catch (error) {
      console.error("❌ Task Agent error:", error);
    }

    setAgentInsights(insights);
  } catch (error) {
    console.error("Error calling Phase 2 agents:", error);
  } finally {
    setAgentLoading(false);
  }
};
```

---

### 6. Display Cards (Analytics View)

#### Loading State

```typescript
{agentLoading && (
  <Card className="p-6 bg-blue-50 border-blue-200">
    <div className="flex items-center gap-3">
      <div className="animate-spin h-5 w-5 text-blue-600">🔄</div>
      <p className="text-blue-700 font-medium">
        Loading AI agent insights...
      </p>
    </div>
  </Card>
)}
```

#### Mentor Insights Card

```typescript
{agentInsights?.mentor && (
  <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="h-6 w-6 text-blue-600" />
      📚 Mentor Agent - Learning Roadmap
    </h3>
    <div className="space-y-4">
      {agentInsights.mentor.performanceAnalysis && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Performance Analysis:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.mentor.performanceAnalysis}
          </p>
        </div>
      )}
      {agentInsights.mentor.learningRoadmap && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Recommended Learning Path:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.mentor.learningRoadmap}
          </p>
        </div>
      )}
      {agentInsights.mentor.recommendations && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Key Recommendations:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.mentor.recommendations}
          </p>
        </div>
      )}
    </div>
  </Card>
)}
```

#### Company Insights Card

```typescript
{agentInsights?.company && (
  <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
      <Briefcase className="h-6 w-6 text-green-600" />
      🏢 Company Simulation - Company Profile & Fit
    </h3>
    <div className="space-y-4">
      {agentInsights.company.companyProfile && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Company Profile:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.company.companyProfile}
          </p>
        </div>
      )}
      {agentInsights.company.fitAnalysis && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Your Fit for this Company:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.company.fitAnalysis}
          </p>
        </div>
      )}
      {agentInsights.company.recommendations && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Improvement Areas:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.company.recommendations}
          </p>
        </div>
      )}
    </div>
  </Card>
)}
```

#### Task Insights Card

```typescript
{agentInsights?.task && (
  <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
      <Clock className="h-6 w-6 text-purple-600" />
      📋 Task Agent - Personalized Task Plan
    </h3>
    <div className="space-y-4">
      {agentInsights.task.taskPlan && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Recommended Tasks:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.task.taskPlan}
          </p>
        </div>
      )}
      {agentInsights.task.schedule && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Suggested Schedule:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.task.schedule}
          </p>
        </div>
      )}
      {agentInsights.task.nextSteps && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">
            Next Steps:
          </p>
          <p className="text-sm text-gray-700">
            {agentInsights.task.nextSteps}
          </p>
        </div>
      )}
    </div>
  </Card>
)}
```

---

## Backend Code (Reference)

### Backend Routes Mount (server.js, Line 112)

```javascript
app.use("/api/agents", authenticateToken, agentRoutes);
```

### Mentor Agent Endpoint Example (agents.js)

```javascript
router.post(
  "/mentor/analyze-placement",
  asyncHandler(async (req, res) => {
    const {
      userId,
      simulationId,
      overallScore,
      steps,
      resumeData,
      performance,
    } = req.body;

    if (!userId || !simulationId) {
      return res.status(400).json({
        success: false,
        error: "userId and simulationId are required",
      });
    }

    const analysis = await mentorAgent.analyzePlacementData({
      userId,
      simulationId,
      overallScore,
      steps,
      resumeData,
      performance,
    });

    res.json({
      success: true,
      data: analysis,
    });
  }),
);
```

### Agent Service Example (mentorAgent.js)

```javascript
async analyzePlacementData(simulationData) {
  try {
    const prompt = `
      Analyze this placement simulation performance and provide insights:
      ${JSON.stringify(simulationData, null, 2)}

      Return JSON with:
      - performanceAnalysis
      - learningRoadmap
      - recommendations
      - progressTracking
    `;

    const response = await genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      .generateContent(prompt);

    return JSON.parse(response.response.text());
  } catch (error) {
    console.error('Error in mentorAgent:', error);
    throw error;
  }
}
```

---

## Flow Diagram

```
User Action
    ↓
PlacementSimulation.tsx
    ├─ User completes simulation
    └─ currentView = "analytics"
    ↓
useEffect Hook Detects
    ├─ currentView === "analytics" ✓
    ├─ simulation exists ✓
    └─ !agentInsights ✓
    ↓
callPhase2Agents() Executes
    ├─ Prepares simulationData
    ├─ setAgentLoading(true)
    └─ Makes 3 sequential API calls
    ↓
API Calls
    ├─ mentorAPI.analyzePlacement()
    ├─ companyAPI.createProfile()
    └─ taskAPI.generatePlan()
    ↓
Backend Processing (/api/agents/*)
    ├─ Receive request data
    ├─ Call agent service
    ├─ Send to Gemini API
    └─ Return response
    ↓
Response Handling
    ├─ Store in agentInsights state
    ├─ Log to console (with emojis)
    └─ setAgentLoading(false)
    ↓
Component Re-render
    ├─ Check agentInsights?.mentor
    ├─ Check agentInsights?.company
    └─ Check agentInsights?.task
    ↓
Display Cards
    ├─ Mentor Card (Blue)
    ├─ Company Card (Green)
    └─ Task Card (Purple)
    ↓
User Sees Results
```

---

## Testing Checklist

- [ ] Backend runs without errors
- [ ] Frontend runs without errors
- [ ] Complete a placement simulation
- [ ] View analytics results
- [ ] Open DevTools Console (F12)
- [ ] Look for emoji indicators (📚, 🏢, 📋)
- [ ] Verify "✅ Mentor insights received"
- [ ] Verify "✅ Company profile received"
- [ ] Verify "✅ Task plan received"
- [ ] See three colored cards in UI
- [ ] Cards display agent insights text
- [ ] No errors in console

---

## Common Issues & Solutions

### Issue: TypeError - mentorAPI is not defined

**Solution**: Make sure api.js exports are correct

```javascript
// Check that this exists in api.js:
export const mentorAPI = { ... };
export const companyAPI = { ... };
export const taskAPI = { ... };
```

### Issue: 404 Error - Cannot POST /api/agents/mentor/analyze-placement

**Solution**: Verify routes are mounted in server.js

```javascript
// Line 112 should be:
app.use("/api/agents", authenticateToken, agentRoutes);
```

### Issue: Agents not being called

**Solution**: Check useEffect hook dependencies

```typescript
// Should be:
useEffect(() => {
  if (currentView === "analytics" && simulation && !agentInsights) {
    callPhase2Agents();
  }
}, [currentView, simulation]);
```

### Issue: No console output

**Solution**:

1. Make sure browser console is open (F12)
2. Complete full simulation (all 6 rounds)
3. View analytics results
4. Look for emoji symbols

---

## Documentation Files Created

1. **PHASE_2_INTEGRATION_COMPLETE.md** - Comprehensive integration details
2. **PHASE_2_VERIFICATION_GUIDE.md** - Testing and troubleshooting guide
3. **PHASE_2_QUICK_INTEGRATION_SUMMARY.md** - Quick reference guide
4. **PHASE_2_ARCHITECTURE_DIAGRAM.md** - Visual architecture and flow diagrams
5. **PHASE_2_COMPLETION_REPORT.md** - Completion report and summary
6. **PHASE_2_CODE_REFERENCE.md** - This file with code snippets

---

## Summary

✅ **All Phase 2 agents now integrated!**

- ✅ Backend: Routes, services, Gemini API
- ✅ Frontend: APIs, component logic, display cards
- ✅ Integration: Auto-triggering, error handling, logging
- ✅ Testing: Ready to test with npm run dev

**Next Step**: Run backend, run frontend, complete simulation, check console! 🚀
