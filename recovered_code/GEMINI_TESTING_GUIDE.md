# Gemini Agent Testing Guide

## Quick Start

After refactoring to Gemini API, follow these steps to verify everything works:

### Step 1: Start the Backend

```bash
cd backend
npm run dev
```

Expected output:

```
Server running on port 5000
Database connected
```

### Step 2: Test InterviewerAgent

#### Test 2a: Evaluate Response

```bash
curl -X POST http://localhost:5000/api/agents/interviewer/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "question": "Explain the difference between REST and GraphQL",
    "userAnswer": "REST uses HTTP endpoints for resources, GraphQL uses a single endpoint with query language for flexible data fetching. GraphQL is better because...",
    "interviewType": "technical"
  }'
```

Expected Response:

```json
{
  "success": true,
  "data": {
    "score": 75,
    "correctness": 85,
    "completeness": 80,
    "clarity": 70,
    "depth": 60,
    "confidence": 80,
    "feedback": "Good understanding of both concepts...",
    "strengths": ["Clear explanation", "Mentions key differences"],
    "weaknesses": ["Could explain GraphQL benefits better"],
    "recommendedDifficulty": "medium",
    "topic": "API Design"
  }
}
```

#### Test 2b: Generate Next Question

```bash
curl -X POST http://localhost:5000/api/agents/interviewer/next-question \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "interviewType": "technical",
    "difficulty": "medium",
    "topics": ["DSA", "System Design"],
    "previousTopics": ["Arrays", "Strings"]
  }'
```

### Step 3: Test CodingEvaluatorAgent

#### Test 3a: Analyze Code

```bash
curl -X POST http://localhost:5000/api/agents/coding/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "code": "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
    "language": "javascript",
    "problemStatement": "Write a function to calculate the nth Fibonacci number"
  }'
```

Expected Response:

```json
{
  "success": true,
  "data": {
    "codeQuality": {
      "score": 65,
      "readability": 85,
      "maintainability": 60,
      "documentation": 40
    },
    "logicAnalysis": {
      "isCorrect": true,
      "issues": ["Inefficient recursive approach", "No memoization"],
      "edgeCasesHandled": ["n=0", "n=1"]
    },
    "complexityAnalysis": {
      "timeComplexity": "O(2^n)",
      "spaceComplexity": "O(n)",
      "isOptimal": false,
      "optimizationSuggestions": ["Use dynamic programming", "Add memoization"]
    },
    "topicsIdentified": ["Recursion", "Dynamic Programming"],
    "weakAreas": ["Optimization", "Complexity Analysis"],
    "overallScore": 68,
    "verdict": "needs-improvement"
  }
}
```

#### Test 3b: Detect Weak Topics

```bash
curl -X POST http://localhost:5000/api/agents/coding/weak-topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "code": "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }",
    "language": "javascript",
    "problemStatement": "Calculate Fibonacci number"
  }'
```

### Step 4: Test HRBehaviorAgent

#### Test 4a: Analyze Behavioral Response

```bash
curl -X POST http://localhost:5000/api/agents/hr/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "question": "Tell me about a time you handled a conflict with a team member",
    "answer": "Last year, I had a disagreement with my colleague about code architecture. Instead of arguing, I suggested we discuss it in a meeting, we presented both approaches and found a middle ground that combined benefits of both. This taught me the importance of communication and compromise.",
    "questionCategory": "conflict"
  }'
```

Expected Response:

```json
{
  "success": true,
  "data": {
    "overallScore": 82,
    "communicationQuality": {
      "score": 85,
      "clarity": 90,
      "conciseness": 80,
      "structuredness": 85
    },
    "confidenceLevel": {
      "score": 85,
      "indicators": ["Clear voice", "Specific examples", "Shows learning"],
      "concerns": []
    },
    "redFlags": [],
    "greenFlags": [
      "Problem-solving mindset",
      "Good communication",
      "Learning from experience"
    ],
    "competenciesDemonstrated": [
      "Teamwork",
      "Communication",
      "Conflict Resolution"
    ],
    "hireability": "strong-yes"
  }
}
```

#### Test 4b: Analyze Communication Patterns

```bash
curl -X POST http://localhost:5000/api/agents/hr/patterns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "responses": [
      {
        "question": "Tell me about your strengths",
        "answer": "I am very detail-oriented and passionate about learning..."
      },
      {
        "question": "Tell me about a challenge",
        "answer": "Once I found myself in a difficult situation where..."
      },
      {
        "question": "Where do you want to be in 5 years?",
        "answer": "I want to be a senior engineer leading a team..."
      }
    ]
  }'
```

## Debugging Guide

### Issue: "Invalid API Key"

**Solution**: Verify `GEMINI_API_KEY` is set in `.env`

```bash
echo $GEMINI_API_KEY
# Should output: AIzaSyCPZdwsMnekrY3eWUMMNJ_4sGPbTonTDcc
```

### Issue: "JSON parsing error"

**Common Cause**: Gemini response contains markdown code blocks that weren't cleaned
**Solution**: Verify `cleanJSON()` method is properly removing ` ```json ` and ` ``` `

### Issue: "Timeout after 30 seconds"

**Cause**: Gemini API slow or network issue
**Solution**: Check internet connection, try again, or increase timeout to 40000ms

### Issue: Rate limit (429 error)

**Cause**: Exceeded 60 requests per minute
**Solution**: Add delay between requests or queue requests

## Performance Expectations

| Operation          | Expected Time | Success Rate |
| ------------------ | ------------- | ------------ |
| Evaluate Response  | 2-4s          | >95%         |
| Generate Question  | 3-5s          | >95%         |
| Analyze Code       | 3-6s          | >90%         |
| Detect Weak Topics | 2-4s          | >90%         |
| Analyze Behavior   | 2-4s          | >95%         |
| Detect Patterns    | 3-5s          | >95%         |

## Monitoring Tips

### Check API Usage

Monitor in real-time with:

```bash
tail -f backend.log | grep -i "gemini\|error\|api"
```

### Verify Response Quality

```bash
# Check if responses are valid JSON
curl http://localhost:5000/api/agents/interviewer/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"question":"Test?","userAnswer":"Test","interviewType":"technical"}' | jq .
```

### Track Token Usage

Each API call logs tokens used:

```javascript
console.log(`Response tokens: ${responseText.split(" ").length * 1.3}`);
```

## Common Test Scenarios

### Scenario 1: Full Interview Session

1. Start with easy technical question
2. Evaluate answer (score < 40)
3. Confirm it suggests "easy" difficulty
4. Generate next easy question
5. Repeat with better answers
6. Confirm difficulty increases

### Scenario 2: Code Quality Assessment

1. Submit poor code (no error handling)
2. Confirm agent identifies issues
3. Request improvement plan
4. Verify suggested topics match code weaknesses

### Scenario 3: Behavioral Evaluation

1. Submit response with red flag language
2. Confirm agent detects issue
3. Check pattern analysis across multiple responses
4. Verify final hireability score is reasonable

## Success Criteria

✅ All endpoints respond within 6 seconds
✅ JSON responses parse correctly
✅ No OpenAI errors in logs
✅ Rate limits not exceeded (<60 req/min)
✅ Error handling works (invalid JSON, missing fields)
✅ Score calculations are reasonable (0-100 range)

## Next Steps After Testing

1. ✅ Verify all agents working with Gemini
2. ⏳ Run full interview simulation flow
3. ⏳ Test with real user data from database
4. ⏳ Monitor performance over 24 hours
5. ⏳ Begin Phase 2 implementation

## Troubleshooting Resources

- Check logs: `backend/logs/`
- Gemini API docs: https://ai.google.dev/docs
- Rate limits: 60 req/min free tier
- Token limits: 2M input, 8K output
- If stuck: Check if `npm run dev` shows any errors during startup
