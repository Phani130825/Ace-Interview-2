# Phase 1 AI Agents Implementation Guide

## Overview

Phase 1 implements three core AI agents for the Placement Simulation App:

1. **AI Interviewer Agent** - Adaptive technical & behavioral interviews
2. **AI Coding Evaluator Agent** - Code analysis & weak topic detection
3. **HR Behavior Agent** - Behavioral analysis & feedback

## Architecture

### Backend Services

```
backend/services/
├── interviewerAgent.js        # Interview logic with adaptive difficulty
├── codingEvaluatorAgent.js    # Code analysis & topic detection
└── hrBehaviorAgent.js         # Behavioral analysis & feedback

backend/routes/
└── agents.js                   # API endpoints for all agents

backend/models/
└── PlacementSimulation.js      # Enhanced with weak topic tracking
```

### Data Flow

```
User Submission
    ↓
Agent Analysis (LLM)
    ↓
Performance Metrics Stored
    ↓
Weak Topics Identified
    ↓
Recommendations Generated
    ↓
Next Round Difficulty Adapted
```

---

## 1️⃣ AI Interviewer Agent

### Features

- **Adaptive Difficulty**: Scales questions based on performance
- **Context-Aware Questions**: Follows up based on previous answers
- **Automatic Feedback**: Provides constructive, specific feedback
- **Topic Tracking**: Identifies strong and weak topics

### Key Methods

#### `evaluateResponse(question, userAnswer, interviewType)`

Evaluates an interview response and returns:

- Score (0-100)
- Correctness, Completeness, Clarity, Depth, Confidence
- Feedback and identified topic
- Recommended next difficulty

**Example:**

```javascript
const evaluation = await interviewerAgent.evaluateResponse(
  "Explain what is a HashMap",
  "A HashMap is a data structure that stores key-value pairs...",
  "technical",
);
```

#### `generateNextQuestion(interviewType, difficulty, topics, previousTopics)`

Generates the next interview question with adaptive difficulty.

**Example:**

```javascript
const question = await interviewerAgent.generateNextQuestion(
  "technical",
  "medium",
  ["DSA", "OOP"],
  ["Arrays", "String"],
);
```

#### `generateComprehensiveFeedback(interviewType, questionsWithAnswers, overallScore)`

Creates end-of-interview comprehensive feedback.

#### `calculateNextDifficulty(score, currentDifficulty)`

Determines next question difficulty based on performance:

- Score ≥ 80: Increase difficulty
- Score 60-79: Maintain difficulty
- Score 40-59: Decrease difficulty
- Score < 40: Significantly decrease

---

## 2️⃣ AI Coding Evaluator Agent

### Features

- **Comprehensive Code Analysis**: Quality, logic, complexity
- **Weak Topic Detection**: Identifies patterns across submissions
- **Adaptive Problem Generation**: Creates problems for weak topics
- **Edge Case Analysis**: Tests robustness of solutions

### Key Methods

#### `analyzeCode(code, language, problemStatement)`

Analyzes code and returns:

- Code quality scores (readability, maintainability)
- Logic correctness and edge cases
- Time & space complexity analysis
- Identified topics and weak areas

**Example:**

```javascript
const analysis = await codingEvaluatorAgent.analyzeCode(
  "def findMax(arr): return max(arr)",
  "python",
  "Find the maximum element in an array",
);
```

#### `detectWeakTopics(codeAnalyses)`

Analyzes multiple submissions to identify weak topics:

- Topic frequency analysis
- Recommended problems for each weak topic
- Learning path and estimated mastery time

#### `generateProblemFromTopic(topic, difficulty, language)`

Generates a new coding problem for a specific weak topic:

- Problem statement with examples
- Constraints and hints
- Expected approach and complexity
- Follow-up problems

#### `generateImprovementPlan(codeAnalysis, submissionHistory)`

Creates a personalized improvement plan with:

- Immediate fixes for identified issues
- Code review comments with severity
- Design pattern suggestions
- Performance optimizations

### Scoring Formula

```
FinalScore =
  (Correctness: 0-100) × 0.40 +
  (Complexity: 0-100) × 0.20 +
  (Code Quality: 0-100) × 0.20 +
  (Edge Cases: 0-100) × 0.20
```

---

## 3️⃣ HR Behavior Agent

### Features

- **Behavioral Analysis**: Evaluates communication & confidence
- **Pattern Detection**: Identifies personality trends
- **Red Flag Detection**: Identifies potential issues
- **Adaptive Questions**: Generates targeted behavioral questions

### Key Methods

#### `analyzeBehavioralResponse(question, answer, questionCategory)`

Analyzes a single HR response for:

- Communication quality (clarity, conciseness, structure)
- Confidence level detection
- Content relevance and specificity
- Red flags and green flags
- Demonstrated competencies

**Example:**

```javascript
const analysis = await hrBehaviorAgent.analyzeBehavioralResponse(
  "Tell me about a time you failed",
  "Once I missed a deadline because I underestimated complexity...",
  "learning-from-failure",
);
```

#### `analyzeCommunicationPatterns(responses)`

Analyzes multiple responses to identify:

- Communication style (analytical, collaborative, leadership)
- Overall confidence level
- Stress handling methods
- Adaptability and learning patterns
- Culture alignment score

#### `detectRedFlags(responses)`

Identifies potential concerns:

- Critical red flags with severity
- Verification needed items
- Overall risk assessment
- Recommended follow-up actions

#### `generateNextQuestion(previousTopics, focusArea)`

Generates targeted behavioral questions:

- Avoids previously covered topics
- Focuses on specific areas (stress, teamwork, leadership)
- Includes follow-up suggestions

---

## API Endpoints

### Interviewer Agent Endpoints

**POST** `/api/agents/interviewer/evaluate-response`

```json
{
  "question": "What is OOP?",
  "answer": "Object-oriented programming is...",
  "interviewType": "technical"
}
```

**POST** `/api/agents/interviewer/next-question`

```json
{
  "interviewType": "technical",
  "difficulty": "medium",
  "topics": ["DSA", "OOP"],
  "previousTopics": ["Arrays"]
}
```

**POST** `/api/agents/interviewer/feedback`

```json
{
  "interviewType": "technical",
  "questionsWithAnswers": [...],
  "overallScore": 75
}
```

**POST** `/api/agents/interviewer/extract-topics`

```json
{
  "responses": [
    {
      "question": "...",
      "answer": "..."
    }
  ],
  "interviewType": "technical"
}
```

---

### Coding Evaluator Endpoints

**POST** `/api/agents/coding/analyze`

```json
{
  "code": "def solution(arr): ...",
  "language": "python",
  "problemStatement": "Find the maximum element"
}
```

**POST** `/api/agents/coding/detect-weak-topics`

```json
{
  "codeAnalyses": [
    {
      "problem": "Two Sum",
      "score": 65,
      "weakAreas": ["HashMap", "Time Complexity"],
      "topicsIdentified": ["HashTable", "Arrays"]
    }
  ]
}
```

**POST** `/api/agents/coding/generate-problem`

```json
{
  "topic": "Dynamic Programming",
  "difficulty": "medium",
  "language": "python"
}
```

**POST** `/api/agents/coding/improvement-plan`

```json
{
  "codeAnalysis": {...},
  "submissionHistory": [...]
}
```

---

### HR Behavior Endpoints

**POST** `/api/agents/hr/analyze-response`

```json
{
  "question": "Tell me about yourself",
  "answer": "I'm a software engineer with 5 years...",
  "category": "self-introduction"
}
```

**POST** `/api/agents/hr/communication-patterns`

```json
{
  "responses": [
    {
      "question": "...",
      "answer": "...",
      "category": "..."
    }
  ]
}
```

**POST** `/api/agents/hr/detect-red-flags`

```json
{
  "responses": [...]
}
```

**POST** `/api/agents/hr/next-question`

```json
{
  "previousTopics": ["self-introduction", "motivation"],
  "focusArea": "conflict-resolution"
}
```

---

## Integration with PlacementSimulation

### Enhanced Model Structure

```javascript
// New fields in PlacementSimulation
{
  coding: {
    // ... existing fields
    codeQuality: { score, readability, maintainability },
    topicsIdentified: [String],
    strengthAreas: [String],
    weakAreas: [String]
  },

  technicalInterview: {
    // ... existing fields
    topicsCovered: [String],
    strongTopics: [String],
    weakTopics: [String],
    adaptiveDifficulty: {
      initialDifficulty,
      finalDifficulty,
      difficultyProgression: [String]
    }
  },

  hrInterview: {
    // ... existing fields
    communicationScore: Number,
    confidenceLevel: Number,
    redFlags: [String],
    greenFlags: [String],
    competenciesDemonstrated: [String]
  },

  performanceMetrics: {
    weakTopics: [{
      topic: String,
      occurrences: Number,
      scores: [Number],
      recommendedFocus: Boolean
    }],
    agentRecommendations: {
      interviewerAgent: { ... },
      codingEvaluator: { ... },
      hrBehavior: { ... }
    }
  }
}
```

### Recommendation Endpoint

**GET** `/api/agents/recommendations/:simulationId`

Returns aggregated recommendations from all agents for the completed simulation.

---

## Usage Examples

### Complete Interview Flow

```javascript
// 1. Start interview with first question
const firstQuestion = await interviewerAgent.generateNextQuestion(
  "technical",
  "medium",
);

// 2. User answers question
const evaluation = await interviewerAgent.evaluateResponse(
  firstQuestion.question,
  userAnswer,
  "technical",
);

// 3. Determine next difficulty
const nextDifficulty = interviewerAgent.calculateNextDifficulty(
  evaluation.score,
  "medium",
);

// 4. Generate next question
const nextQuestion = await interviewerAgent.generateNextQuestion(
  "technical",
  nextDifficulty,
  [],
  [evaluation.topic],
);

// 5. At end, generate comprehensive feedback
const feedback = await interviewerAgent.generateComprehensiveFeedback(
  "technical",
  allQuestionsWithAnswers,
  overallScore,
);
```

### Complete Coding Evaluation Flow

```javascript
// 1. User submits code
const analysis = await codingEvaluatorAgent.analyzeCode(
  userCode,
  "python",
  problemStatement,
);

// 2. Calculate score
const score = codingEvaluatorAgent.calculateCodingScore(analysis);

// 3. After multiple submissions, detect weak topics
const weakTopics = await codingEvaluatorAgent.detectWeakTopics(allAnalyses);

// 4. Generate problem for weakest topic
const newProblem = await codingEvaluatorAgent.generateProblemFromTopic(
  weakTopics.weakTopics[0],
  "medium",
  "python",
);

// 5. Generate improvement plan
const plan = await codingEvaluatorAgent.generateImprovementPlan(
  analysis,
  submissionHistory,
);
```

---

## Environment Variables

Ensure these are set in `.env`:

```
OPENAI_API_KEY=<your-key>
OPENAI_MODEL=gpt-3.5-turbo
GEMINI_API_KEY=<your-key>
```

---

## Error Handling

All agent methods return:

```javascript
{
  success: boolean,
  data?: any,
  error?: string
}
```

Always check `success` before accessing `data`:

```javascript
const result = await interviewerAgent.evaluateResponse(...);
if (!result.success) {
  console.error('Evaluation failed:', result.error);
  return;
}
// Use result.data
```

---

## Testing Phase 1 Agents

### Unit Tests

```javascript
// Test evaluateResponse
const testEvaluation = async () => {
  const result = await interviewerAgent.evaluateResponse(
    "What is React?",
    "React is a JavaScript library for building UIs",
    "technical",
  );
  console.assert(result.success, "Evaluation should succeed");
  console.assert(result.data.score >= 0 && result.data.score <= 100);
};

// Test generateNextQuestion
const testQuestionGeneration = async () => {
  const result = await interviewerAgent.generateNextQuestion(
    "technical",
    "medium",
  );
  console.assert(result.success, "Should generate question");
  console.assert(result.data.question.length > 0);
};
```

---

## Performance Considerations

1. **API Costs**: Each agent call uses ~500-2000 tokens
   - Cost: ~$0.001-0.003 per call
   - Budget: ~$0.1-0.3 per full interview

2. **Response Time**: 2-5 seconds per agent call
   - Suitable for non-real-time feedback
   - Consider caching for repeated queries

3. **Token Limits**: OpenAI has rate limits
   - Free tier: 3 req/min
   - Paid: 3,500 req/min
   - Consider implementing queue system for high volume

---

## Next Steps (Phase 2)

1. **Personalized Mentor Agent**: Learning roadmaps & recommendations
2. **Company Simulation Agent**: Company-specific interview patterns
3. **Autonomous Task Agent**: Scheduling & progress tracking

See `PHASE2_IMPLEMENTATION.md` for detailed Phase 2 plan.

---

## Support & Debugging

For issues:

1. Check `.env` for valid API keys
2. Review agent method response in Network tab
3. Check server logs for LLM errors
4. Validate input format matches schema

---

**Last Updated**: January 27, 2026
**Phase 1 Status**: ✅ Complete
