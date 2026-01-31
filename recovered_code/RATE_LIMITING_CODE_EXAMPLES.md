# 💻 Rate Limiting - Code Examples & Use Cases

**Version**: 1.0  
**Last Updated**: January 28, 2026

---

## 📚 Table of Contents

1. [Basic Usage](#basic-usage)
2. [Integration Examples](#integration-examples)
3. [Monitoring & Debugging](#monitoring--debugging)
4. [Error Handling](#error-handling)
5. [Configuration Scenarios](#configuration-scenarios)
6. [Performance Tuning](#performance-tuning)

---

## Basic Usage

### 1. Create a Rate Limiter Instance

```javascript
import { RateLimiter } from "./services/rateLimiter.js";

// Custom rate limiter for different API
const customLimiter = new RateLimiter({
  maxRequestsPerSecond: 5,
  maxConcurrentRequests: 2,
  backoffMultiplier: 1.5,
  maxRetries: 2,
});
```

### 2. Queue a Single Request

```javascript
import { geminiRateLimiter } from "./services/rateLimiter.js";

// Simple function
const result = await geminiRateLimiter.add(async () => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const response = await model.generateContent("Hello");
  return response.response.text();
}, "my_unique_request_id");

console.log(result); // "Hi! How can I help?"
```

### 3. Queue Multiple Requests (Parallel)

```javascript
const requestIds = ["req_1", "req_2", "req_3"];
const promises = [];

requestIds.forEach((id) => {
  promises.push(
    geminiRateLimiter.add(() => generateAgentResponse(agentType, message), id),
  );
});

const results = await Promise.all(promises);
console.log(results); // All responses
```

---

## Integration Examples

### Example 1: Simple Agent Response

```javascript
// In groupDiscussionAgent.js
async generateAgentResponse(agentType, userMessage) {
  try {
    const personality = AGENT_PERSONALITIES[agentType];
    const prompt = buildPrompt(personality, userMessage);

    // Queue through rate limiter
    const agentMessage = await geminiRateLimiter.add(
      async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);
        return response.response.text();
      },
      `agent_${agentType}_${Date.now()}`
    );

    return {
      agent: agentType,
      name: personality.name,
      message: agentMessage
    };
  } catch (error) {
    // Rate limiter handles retries, this is final error
    console.error(`Failed to get response from ${agentType}:`, error);
    throw error;
  }
}
```

### Example 2: Multiple Concurrent Agents

```javascript
// In processUserInput()
async processUserInput(userMessage, focusAgent = null) {
  // Select 2-3 agents (not all 5)
  const respondingAgents = focusAgent
    ? [focusAgent]
    : this.selectRespondingAgents(this.discussionMetadata.selectedAgents);

  // Queue all in parallel with rate limiting
  const responses = await Promise.all(
    respondingAgents.map(agentType =>
      geminiRateLimiter.add(
        () => this.generateAgentResponse(agentType, userMessage),
        `agent_${agentType}_${Date.now()}`
      )
    )
  );

  return {
    success: true,
    userMessage,
    agentResponses: responses  // All 2-3 responses
  };
}
```

### Example 3: Consensus Analysis

```javascript
// In analyzeConsensus()
async analyzeConsensus() {
  const recentMessages = this.conversationHistory.slice(-10);
  const messagesSummary = buildSummary(recentMessages);

  const prompt = `Analyze consensus:\n${messagesSummary}`;

  // Queue analysis through rate limiter
  const responseText = await geminiRateLimiter.add(
    async () => {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text();
    },
    `consensus_analysis_${Date.now()}`
  );

  // Parse JSON response
  const analysisData = JSON.parse(responseText);

  return {
    success: true,
    analysis: analysisData
  };
}
```

### Example 4: Sequential Operations

```javascript
// Process multiple steps in sequence
async function processDiscussionSequentially() {
  try {
    // Step 1: Initialize (1 opening statement)
    const opening = await geminiRateLimiter.add(
      () => generateOpening("topic"),
      "step_1_opening",
    );
    console.log("Step 1 done:", opening);

    // Step 2: Get agent responses (2-3 responses)
    const agentResponses = await Promise.all([
      geminiRateLimiter.add(
        () => getAgentResponse("analyst", message),
        "step_2_agent_1",
      ),
      geminiRateLimiter.add(
        () => getAgentResponse("creative", message),
        "step_2_agent_2",
      ),
    ]);
    console.log("Step 2 done:", agentResponses);

    // Step 3: Get consensus (1 analysis)
    const consensus = await geminiRateLimiter.add(
      () => analyzeConsensus(agentResponses),
      "step_3_consensus",
    );
    console.log("Step 3 done:", consensus);

    return { opening, agentResponses, consensus };
  } catch (error) {
    console.error("Process failed:", error);
    throw error;
  }
}
```

---

## Monitoring & Debugging

### 1. Check Queue Status

```javascript
// In any route or service
import { geminiRateLimiter } from "./services/rateLimiter.js";

// Add this in a monitoring endpoint
app.get("/api/health/rate-limiter", (req, res) => {
  const status = geminiRateLimiter.getStatus();

  res.json({
    healthy: status.activeRequests < 10 && status.queueLength < 20,
    queue: {
      waiting: status.queueLength,
      processing: status.activeRequests,
      isRunning: status.isProcessing,
    },
    retries: status.retryAttempts.length,
    lastRequest: new Date(status.lastRequestTime),
  });
});

// Usage:
// GET /api/health/rate-limiter
// Response:
// {
//   "healthy": true,
//   "queue": {
//     "waiting": 0,
//     "processing": 1,
//     "isRunning": true
//   },
//   "retries": 0,
//   "lastRequest": "2026-01-28T10:30:45.123Z"
// }
```

### 2. Detailed Status Logging

```javascript
// Helper function to log queue status
function logRateLimiterStatus() {
  const status = geminiRateLimiter.getStatus();

  console.log("[RATE_LIMITER_STATUS]", {
    timestamp: new Date().toISOString(),
    queue: {
      length: status.queueLength,
      oldestWaitTime: status.queueLength > 0 ? "unknown" : "N/A",
    },
    processing: {
      active: status.activeRequests,
      max: 3,
    },
    retrying: {
      count: status.retryAttempts.length,
      items: status.retryAttempts.map(([id, attempt]) => ({
        id: id.substring(0, 20) + "...",
        attempt,
      })),
    },
    lastRequest: new Date(status.lastRequestTime).toISOString(),
    isProcessing: status.isProcessing,
  });
}

// Log every 5 seconds
setInterval(logRateLimiterStatus, 5000);

// Output example:
// [RATE_LIMITER_STATUS] {
//   timestamp: '2026-01-28T10:30:45.123Z',
//   queue: { length: 2, oldestWaitTime: 'unknown' },
//   processing: { active: 3, max: 3 },
//   retrying: { count: 1, items: [{ id: 'agent_analyst_17041...', attempt: 1 }] },
//   lastRequest: '2026-01-28T10:30:44.987Z',
//   isProcessing: true
// }
```

### 3. Enable Debug Mode

```javascript
// In server.js or .env
process.env.DEBUG = "rateLimiter:*,discussionAgent:*";

// Or just for development
if (process.env.NODE_ENV === "development") {
  console.log("[DEBUG] Rate limiter initialized");
  const status = geminiRateLimiter.getStatus();
  console.log("[DEBUG] Initial status:", status);
}
```

### 4. Monitor with Middleware

```javascript
// Express middleware to track rate limiter health
app.use((req, res, next) => {
  const status = geminiRateLimiter.getStatus();

  // Add to response headers
  res.set("X-RateLimiter-Queue-Length", status.queueLength);
  res.set("X-RateLimiter-Active-Requests", status.activeRequests);

  // Log if queue is backing up
  if (status.queueLength > 10) {
    console.warn(
      "[WARNING] Rate limiter queue backing up:",
      status.queueLength,
    );
  }

  next();
});
```

---

## Error Handling

### 1. Catch Rate Limit Errors

```javascript
// Rate limiter handles retries automatically
// You only see final errors if all 3 retries failed

try {
  const response = await geminiRateLimiter.add(
    () => generateContent(prompt),
    "request_id",
  );
  console.log("Success:", response);
} catch (error) {
  // This is a FINAL error (not a rate limit error)
  if (error.message.includes("Max retries exceeded")) {
    console.error("Request failed after 3 retry attempts");
    // Handle as permanent failure
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### 2. Implement Custom Error Handler

```javascript
// Helper to handle rate limiter errors gracefully
async function executeWithFallback(fn, requestId, fallbackValue = null) {
  try {
    return await geminiRateLimiter.add(fn, requestId);
  } catch (error) {
    console.error(`Request ${requestId} failed:`, error.message);

    if (error.message.includes("Max retries")) {
      // Return default response instead of erroring
      return (
        fallbackValue || {
          message: "Unable to generate response at this time",
          error: true,
        }
      );
    }

    throw error;
  }
}

// Usage:
const response = await executeWithFallback(
  () => generateAgentResponse(agentType, message),
  `agent_${agentType}`,
  { message: "Default response", fromCache: true },
);
```

### 3. Retry Wrapper

```javascript
// If you want custom retry logic (in addition to rate limiter)
async function retryWithBackoff(fn, maxRetries = 2, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await geminiRateLimiter.add(fn, `retry_${i}_${Date.now()}`);
    } catch (error) {
      lastError = error;

      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## Configuration Scenarios

### Scenario 1: Development (Low Traffic)

```javascript
// For testing locally
const devLimiter = new RateLimiter({
  maxRequestsPerSecond: 5, // Slower (testing)
  maxConcurrentRequests: 2, // Conservative
  backoffMultiplier: 1.5,
  maxRetries: 2,
});
```

### Scenario 2: Production Free Tier

```javascript
// For production with Gemini free tier
export const geminiRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 10, // 10 req/sec (safe)
  maxConcurrentRequests: 3, // 3 concurrent max
  backoffMultiplier: 2,
  maxRetries: 3,
});
```

### Scenario 3: Production Growth Tier

```javascript
// For production with Gemini growth tier ($5+/month)
const growthTierLimiter = new RateLimiter({
  maxRequestsPerSecond: 20, // Higher quota
  maxConcurrentRequests: 5, // More parallel
  backoffMultiplier: 2,
  maxRetries: 3,
});
```

### Scenario 4: High-Traffic Enterprise

```javascript
// For enterprise tier with high quota
const enterpriseLimiter = new RateLimiter({
  maxRequestsPerSecond: 50, // Very high quota
  maxConcurrentRequests: 10, // Many parallel
  backoffMultiplier: 2,
  maxRetries: 3,
});
```

---

## Performance Tuning

### 1. Measure Request Latency

```javascript
// Track time from queue to completion
async function measureRequestLatency(fn, requestId) {
  const startTime = Date.now();

  try {
    const result = await geminiRateLimiter.add(fn, requestId);
    const latency = Date.now() - startTime;

    console.log(`Request ${requestId} latency: ${latency}ms`);
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`Request ${requestId} failed after ${latency}ms:`, error);
    throw error;
  }
}

// Usage:
const response = await measureRequestLatency(
  () => generateResponse(),
  "timed_request",
);
```

### 2. Batch Requests for Efficiency

```javascript
// Instead of sequential requests, batch them
// BEFORE (sequential = slow)
const resp1 = await agent1.respond(); // ~3s
const resp2 = await agent2.respond(); // ~3s
const resp3 = await agent3.respond(); // ~3s
// Total: ~9s

// AFTER (parallel through rate limiter = fast)
const [resp1, resp2, resp3] = await Promise.all([
  geminiRateLimiter.add(() => agent1.respond(), "req1"),
  geminiRateLimiter.add(() => agent2.respond(), "req2"),
  geminiRateLimiter.add(() => agent3.respond(), "req3"),
]);
// Total: ~3s (same time as one request due to parallelization)
```

### 3. Optimize Queue Size

```javascript
// Monitor to find optimal settings
const metrics = {
  queueLengths: [],
  processingTimes: [],
  errorRates: [],
};

// Every minute, collect metrics
setInterval(() => {
  const status = geminiRateLimiter.getStatus();

  metrics.queueLengths.push(status.queueLength);

  // Calculate average queue length
  const avgQueue = metrics.queueLengths.slice(-60).reduce((a, b) => a + b) / 60;

  console.log(`Avg queue length: ${avgQueue.toFixed(1)}`);

  // If consistently > 5, increase concurrency
  if (avgQueue > 5) {
    console.warn("Consider increasing maxConcurrentRequests");
  }
}, 60000);
```

### 4. Load Testing

```javascript
// Simulate high load
async function loadTest(userCount = 10, messagesPerUser = 5) {
  const start = Date.now();
  const promises = [];

  for (let user = 0; user < userCount; user++) {
    for (let msg = 0; msg < messagesPerUser; msg++) {
      promises.push(
        geminiRateLimiter
          .add(
            () => generateResponse(`User ${user} msg ${msg}`),
            `load_test_${user}_${msg}`,
          )
          .catch((err) => ({ error: err.message })),
      );
    }
  }

  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  console.log(`Load test complete:
    Total requests: ${results.length}
    Successful: ${successful}
    Failed: ${failed}
    Duration: ${duration}ms
    Avg per request: ${(duration / results.length).toFixed(2)}ms
  `);
}

// Run: await loadTest(10, 5);
```

---

## Summary

### Quick Reference Table

| Task                  | Code                                                | Result                 |
| --------------------- | --------------------------------------------------- | ---------------------- |
| Add single request    | `geminiRateLimiter.add(fn, id)`                     | Promise<result>        |
| Add parallel requests | `Promise.all([limiter.add(fn1), limiter.add(fn2)])` | Both queued & parallel |
| Check status          | `geminiRateLimiter.getStatus()`                     | Queue metrics          |
| Clear queue           | `geminiRateLimiter.clearQueue()`                    | Reject all pending     |
| Handle errors         | `try/catch` on `.add()`                             | Catch final errors     |
| Monitor               | Middleware + logging                                | Track health           |
| Tune                  | Adjust max settings                                 | Optimize performance   |

---

**Last Updated**: January 28, 2026  
**Status**: Production Ready
