# 🧪 Phase 3 - Group Discussion Testing Guide

**Version**: 1.0  
**Status**: Comprehensive Testing Documentation  
**Last Updated**: January 2024

---

## 📋 Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [WebSocket Testing](#websocket-testing)
6. [Performance Testing](#performance-testing)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Manual Testing Scenarios](#manual-testing-scenarios)
9. [Postman Collections](#postman-collections)
10. [Debugging Guide](#debugging-guide)

---

## Setup & Prerequisites

### Environment Setup

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
npm run dev

# Ensure MongoDB is running
mongod --dbpath /path/to/data
```

### Required Variables

```env
# .env
MONGODB_URI=mongodb://localhost:27017/ace-interviews
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_secret_key
NODE_ENV=development
```

### Test Data

```javascript
// Sample test user
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "testuser@example.com",
  name: "Test User",
  token: "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Unit Testing

### 1. Test groupDiscussionAgent.js Service

```bash
npm test -- groupDiscussionAgent.test.js
```

**Test Cases**:

#### Test: Initialize Discussion

```javascript
describe("groupDiscussionAgent", () => {
  describe("initializeDiscussion", () => {
    test("should initialize discussion with valid input", async () => {
      const topic = "Team productivity";
      const agents = ["facilitator", "analyst"];
      const context = { teamSize: 10 };

      const result = await agentService.initializeDiscussion(
        topic,
        agents,
        context,
      );

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("openingStatement");
      expect(result.selectedAgents).toEqual(agents);
      expect(result.status).toBe("active");
    });

    test("should fail with invalid agents", async () => {
      const topic = "Discussion";
      const agents = ["invalid_agent", "another_invalid"];

      await expect(
        agentService.initializeDiscussion(topic, agents, {}),
      ).rejects.toThrow("Invalid agent types");
    });

    test("should fail with empty topic", async () => {
      const topic = "";
      const agents = ["facilitator"];

      await expect(
        agentService.initializeDiscussion(topic, agents, {}),
      ).rejects.toThrow("Topic cannot be empty");
    });
  });
});
```

#### Test: Generate Agent Response

```javascript
describe("generateAgentResponse", () => {
  test("should generate response from specific agent", async () => {
    const agentType = "analyst";
    const message = "What is the best approach?";

    const response = await agentService.generateAgentResponse(
      agentType,
      message,
    );

    expect(response).toHaveProperty("agent", "analyst");
    expect(response).toHaveProperty("name", "Jordan");
    expect(response).toHaveProperty("message");
    expect(response.message.length).toBeGreaterThan(50);
  });

  test("should maintain personality in response", async () => {
    const analyticsResponse = await agentService.generateAgentResponse(
      "analyst",
      "How would you solve this?",
    );
    const creativeSolution = await agentService.generateAgentResponse(
      "creative",
      "How would you solve this?",
    );

    // Responses should be different due to personality
    expect(analyticsResponse.message).not.toEqual(creativeSolution.message);
  });
});
```

#### Test: Analyze Consensus

```javascript
describe("analyzeConsensus", () => {
  test("should identify areas of agreement", async () => {
    const sessionId = "test_session_123";

    const consensus = await agentService.analyzeConsensus(sessionId);

    expect(consensus).toHaveProperty("areasOfAgreement");
    expect(consensus).toHaveProperty("disagreements");
    expect(consensus).toHaveProperty("overallConsensusLevel");
    expect(consensus.overallConsensusLevel).toBeGreaterThanOrEqual(0);
    expect(consensus.overallConsensusLevel).toBeLessThanOrEqual(1);
  });
});
```

#### Test: Generate Summary

```javascript
describe("generateSummary", () => {
  test("should generate comprehensive summary", async () => {
    const sessionId = "test_session_456";

    const summary = await agentService.generateSummary(sessionId);

    expect(summary).toHaveProperty("discussionTopic");
    expect(summary).toHaveProperty("keyPoints");
    expect(summary).toHaveProperty("mainConclusions");
    expect(summary).toHaveProperty("actionItems");
    expect(summary.keyPoints).toBeInstanceOf(Array);
    expect(summary.keyPoints.length).toBeGreaterThan(0);
  });
});
```

---

### 2. Test Routes (groupDiscussions.js)

```bash
npm test -- groupDiscussions.routes.test.js
```

**Test Cases**:

#### Test: POST /api/discussions/initialize

```javascript
describe("POST /api/discussions/initialize", () => {
  test("should initialize discussion with valid data", async () => {
    const response = await request(app)
      .post("/api/discussions/initialize")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        topic: "AI Ethics",
        selectedAgents: ["facilitator", "analyst", "advocate"],
        context: { industry: "tech" },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("sessionId");
    expect(response.body.topic).toBe("AI Ethics");
    expect(response.body.selectedAgents.length).toBe(3);
  });

  test("should fail without authentication", async () => {
    const response = await request(app)
      .post("/api/discussions/initialize")
      .send({
        topic: "Discussion",
        selectedAgents: ["facilitator"],
      });

    expect(response.status).toBe(401);
  });

  test("should fail with invalid agents", async () => {
    const response = await request(app)
      .post("/api/discussions/initialize")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        topic: "Discussion",
        selectedAgents: ["invalid_agent"],
      });

    expect(response.status).toBe(400);
  });
});
```

#### Test: POST /api/discussions/:sessionId/message

```javascript
describe("POST /api/discussions/:sessionId/message", () => {
  test("should send message and get agent responses", async () => {
    const sessionId = "test_session_789";

    const response = await request(app)
      .post(`/api/discussions/${sessionId}/message`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        message: "What are your thoughts?",
        focusAgent: null,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("userMessage");
    expect(response.body).toHaveProperty("agentResponses");
    expect(Array.isArray(response.body.agentResponses)).toBe(true);
  });

  test("should handle focused agent request", async () => {
    const response = await request(app)
      .post(`/api/discussions/test_session_789/message`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        message: "What do you think?",
        focusAgent: "analyst",
      });

    expect(response.status).toBe(200);
    expect(response.body.agentResponses[0].agent).toBe("analyst");
  });
});
```

#### Test: GET /api/discussions/:sessionId/consensus

```javascript
describe("GET /api/discussions/:sessionId/consensus", () => {
  test("should return consensus analysis", async () => {
    const response = await request(app)
      .get("/api/discussions/test_session_789/consensus")
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("consensusAnalysis");
    expect(response.body.consensusAnalysis).toHaveProperty("areasOfAgreement");
    expect(response.body.consensusAnalysis).toHaveProperty("disagreements");
  });
});
```

---

### 3. Test WebSocket Integration

```bash
npm test -- groupDiscussionSocket.test.js
```

**Test Cases**:

```javascript
describe("GroupDiscussion WebSocket", () => {
  let socket;
  let clientSocket;

  beforeAll((done) => {
    // Setup server and socket
    socket = io("http://localhost:3001/discussions", {
      query: { token: validToken },
    });

    socket.on("connect", done);
  });

  afterAll(() => {
    socket.disconnect();
  });

  describe("join_discussion", () => {
    test("should join discussion room", (done) => {
      socket.emit("join_discussion", { sessionId: "test_123" });

      socket.on("discussion_joined", (data) => {
        expect(data).toHaveProperty("sessionId", "test_123");
        expect(data).toHaveProperty("participantCount");
        done();
      });
    });
  });

  describe("user_message", () => {
    test("should broadcast message to all participants", (done) => {
      socket.emit("user_message", {
        sessionId: "test_123",
        message: "Test message",
      });

      socket.on("new_message", (data) => {
        expect(data.message).toBe("Test message");
        done();
      });
    });
  });

  describe("typing indicator", () => {
    test("should send typing indicator", (done) => {
      socket.emit("typing", { sessionId: "test_123" });

      socket.on("user_typing", (data) => {
        expect(data).toHaveProperty("userName");
        done();
      });
    });
  });
});
```

---

## Integration Testing

### Test: End-to-End Message Flow

```javascript
describe("Integration: Complete Message Flow", () => {
  test("should handle full discussion flow", async () => {
    // 1. Initialize
    const initRes = await request(app)
      .post("/api/discussions/initialize")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        topic: "Product Strategy",
        selectedAgents: ["facilitator", "creative", "pragmatist"],
        context: { product: "mobile-app" },
      });

    const sessionId = initRes.body.sessionId;

    // 2. Send message
    const msgRes = await request(app)
      .post(`/api/discussions/${sessionId}/message`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        message: "How should we approach this?",
      });

    expect(msgRes.body.agentResponses.length).toBeGreaterThan(0);

    // 3. Ask specific agent
    const askRes = await request(app)
      .post(`/api/discussions/${sessionId}/ask-agent`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        agentType: "creative",
        question: "Any innovative ideas?",
      });

    expect(askRes.body).toHaveProperty("response");

    // 4. Get consensus
    const consRes = await request(app)
      .get(`/api/discussions/${sessionId}/consensus`)
      .set("Authorization", `Bearer ${validToken}`);

    expect(consRes.body).toHaveProperty("consensusAnalysis");

    // 5. End discussion
    const endRes = await request(app)
      .post(`/api/discussions/${sessionId}/end`)
      .set("Authorization", `Bearer ${validToken}`);

    expect(endRes.body.status).toBe("completed");

    // 6. Verify in database
    const dbRecord = await GroupDiscussionSession.findOne({ _id: sessionId });
    expect(dbRecord).toBeTruthy();
    expect(dbRecord.status).toBe("completed");
  });
});
```

---

## End-to-End Testing

### 1. Browser Testing Flow

```javascript
// test/e2e/discussion.e2e.test.js

describe("End-to-End: Group Discussion", () => {
  beforeEach(() => {
    cy.visit("/group-discussion");
    cy.login("testuser@example.com", "password123");
  });

  describe("Setup Phase", () => {
    test("should display topic input", () => {
      cy.get('[data-testid="discussion-topic-input"]').should("be.visible");
    });

    test("should list all agents", () => {
      cy.get('[data-testid="agent-checkbox"]').should("have.length", 5);
    });

    test("should initialize discussion", () => {
      cy.get('[data-testid="discussion-topic-input"]').type("AI future trends");

      cy.get('[data-testid="agent-checkbox"]').eq(0).click();
      cy.get('[data-testid="agent-checkbox"]').eq(1).click();

      cy.get('[data-testid="start-button"]').click();

      cy.get('[data-testid="discussion-view"]').should("be.visible");
    });
  });

  describe("Discussion Phase", () => {
    test("should display messages in real-time", () => {
      // Setup discussion...

      cy.get('[data-testid="message-input"]').type(
        "What are the biggest trends?",
      );

      cy.get('[data-testid="send-button"]').click();

      cy.get('[data-testid="user-message"]').should(
        "contain",
        "What are the biggest trends?",
      );

      cy.get('[data-testid="agent-message"]', { timeout: 5000 }).should(
        "have.length.greaterThan",
        0,
      );
    });

    test("should allow agent questioning", () => {
      cy.get('[data-testid="ask-agent-button"]').eq(0).click();

      cy.get('[data-testid="agent-question-modal"]').should("be.visible");

      cy.get('[data-testid="question-input"]').type("Tell me more about this");

      cy.get('[data-testid="submit-question"]').click();

      cy.get('[data-testid="agent-answer"]').should("be.visible");
    });
  });

  describe("Analysis Phase", () => {
    test("should show consensus", () => {
      // Setup discussion and send messages...

      cy.get('[data-testid="get-consensus-button"]').click();

      cy.get('[data-testid="consensus-panel"]').should("be.visible");

      cy.get('[data-testid="agreement-area"]').should("exist");

      cy.get('[data-testid="disagreement-area"]').should("exist");
    });

    test("should show summary", () => {
      cy.get('[data-testid="get-summary-button"]').click();

      cy.get('[data-testid="summary-panel"]').should("be.visible");

      cy.get('[data-testid="key-points"]').should("have.length.greaterThan", 0);

      cy.get('[data-testid="action-items"]').should(
        "have.length.greaterThan",
        0,
      );
    });
  });

  describe("Completion Phase", () => {
    test("should end discussion and show results", () => {
      cy.get('[data-testid="end-discussion-button"]').click();

      cy.get('[data-testid="final-report"]').should("be.visible");

      cy.get('[data-testid="results-view"]').should("be.visible");
    });
  });
});
```

---

## WebSocket Testing

### Real-time Communication Tests

```javascript
describe("WebSocket Real-time Communication", () => {
  let socket;
  const mockToken = generateTestToken();

  beforeEach((done) => {
    socket = io("http://localhost:3001/discussions", {
      query: { token: mockToken },
    });
    socket.on("connect", done);
  });

  afterEach(() => {
    socket.disconnect();
  });

  describe("Message Broadcasting", () => {
    test("should broadcast user message to all participants", (done) => {
      const message = "Test broadcast message";

      socket.emit("user_message", {
        sessionId: "test_session",
        message: message,
      });

      socket.on("new_message", (data) => {
        expect(data.message).toBe(message);
        expect(data.agent).toBe("user");
        done();
      });
    });

    test("should follow up with agent responses", (done) => {
      socket.emit("user_message", {
        sessionId: "test_session",
        message: "Your thoughts?",
      });

      let agentResponseCount = 0;

      socket.on("agent_response", (data) => {
        agentResponseCount++;
        expect(data).toHaveProperty("agent");
        expect(data).toHaveProperty("message");

        if (agentResponseCount >= 2) {
          done();
        }
      });
    });
  });

  describe("Multi-Client Synchronization", () => {
    test("should sync messages across multiple clients", (done) => {
      const socket2 = io("http://localhost:3001/discussions", {
        query: { token: mockToken },
      });

      socket.emit("join_discussion", { sessionId: "test_sync" });
      socket2.emit("join_discussion", { sessionId: "test_sync" });

      socket.emit("user_message", {
        sessionId: "test_sync",
        message: "Hello from socket 1",
      });

      socket2.on("new_message", (data) => {
        expect(data.message).toBe("Hello from socket 1");
        socket2.disconnect();
        done();
      });
    });
  });

  describe("Connection Resilience", () => {
    test("should auto-reconnect on disconnection", (done) => {
      const reconnectSocket = io("http://localhost:3001/discussions", {
        query: { token: mockToken },
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionDelayMax: 500,
        reconnectionAttempts: 5,
      });

      reconnectSocket.on("connect", () => {
        // Simulate disconnection
        reconnectSocket.disconnect();

        reconnectSocket.on("reconnect", () => {
          expect(reconnectSocket.connected).toBe(true);
          reconnectSocket.disconnect();
          done();
        });

        reconnectSocket.connect();
      });
    });
  });
});
```

---

## Performance Testing

### Load Testing

```javascript
describe("Performance: Load Testing", () => {
  test("should handle 50 concurrent messages", async () => {
    const sessionId = "perf_test_session";

    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < 50; i++) {
      const promise = request(app)
        .post(`/api/discussions/${sessionId}/message`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          message: `Message ${i}`,
        });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    const duration = endTime - startTime;
    const avgResponseTime = duration / 50;

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(avgResponseTime).toBeLessThan(500); // Less than 500ms per message
  });

  test("should maintain response time with increasing load", async () => {
    const sessionId = "perf_test_session_2";

    const testLoads = [10, 50, 100];
    const timings = [];

    for (const load of testLoads) {
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < load; i++) {
        const promise = request(app)
          .post(`/api/discussions/${sessionId}/message`)
          .set("Authorization", `Bearer ${validToken}`)
          .send({ message: `Message ${i}` });
        promises.push(promise);
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      timings.push(duration / load);
    }

    // Verify time doesn't increase exponentially
    expect(timings[1] / timings[0]).toBeLessThan(2);
    expect(timings[2] / timings[1]).toBeLessThan(2);
  });
});
```

---

## Edge Cases & Error Handling

### 1. Invalid Session Handling

```javascript
describe("Edge Cases: Invalid Sessions", () => {
  test("should handle non-existent session", async () => {
    const response = await request(app)
      .get("/api/discussions/invalid_session_id/consensus")
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });

  test("should handle expired session", async () => {
    // Simulate expired session
    const expiredSessionId = "expired_session";

    const response = await request(app)
      .post(`/api/discussions/${expiredSessionId}/message`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: "Test" });

    expect(response.status).toBe(410); // Gone
  });
});
```

### 2. Agent Timeout Handling

```javascript
describe("Edge Cases: Agent Timeouts", () => {
  test("should handle slow agent response", async () => {
    // Mock a slow agent response
    jest
      .spyOn(GoogleGenerativeAI.prototype, "generateContent")
      .mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("response"), 5000)),
      );

    const response = await request(app)
      .post("/api/discussions/test/message")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: "Test" });

    // Should timeout after 10 seconds
    expect(response.status).toBe(504); // Gateway Timeout
  }, 15000);
});
```

### 3. Large Message Handling

```javascript
describe("Edge Cases: Large Messages", () => {
  test("should handle very long message", async () => {
    const longMessage = "A".repeat(10000);

    const response = await request(app)
      .post("/api/discussions/test/message")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: longMessage });

    expect(response.status).toBe(200);
  });

  test("should limit maximum message size", async () => {
    const tooLongMessage = "A".repeat(100000);

    const response = await request(app)
      .post("/api/discussions/test/message")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: tooLongMessage });

    expect(response.status).toBe(413); // Payload Too Large
  });
});
```

---

## Manual Testing Scenarios

### Scenario 1: Complete Discussion Flow

**Setup**:

1. Open http://localhost:5173/group-discussion
2. Login with test credentials

**Steps**:

1. Enter topic: "How should we improve code quality?"
2. Select agents: Facilitator, Analyst, Pragmatist
3. Click "Start Discussion"

**Expected Results**:

- Discussion initializes with opening statement
- All 3 selected agents visible
- Messages display in real-time
- Agents provide diverse perspectives

**Verification**:

- [ ] Opening statement received
- [ ] Agents selected correctly
- [ ] Messages sent successfully
- [ ] Agent responses appear within 3 seconds
- [ ] Session saved to database

---

### Scenario 2: Agent Questioning

**Setup**: Complete Scenario 1

**Steps**:

1. Click "Quick Ask" button for Creative agent
2. Enter: "What's an innovative approach?"
3. Submit

**Expected Results**:

- Modal appears for selected agent
- Question sent and received by agent
- Agent provides focused response
- Response displayed within 3 seconds

**Verification**:

- [ ] Modal appears correctly
- [ ] Question submitted successfully
- [ ] Creative agent selected properly
- [ ] Response contains innovative ideas
- [ ] Message count increases correctly

---

### Scenario 3: Consensus Analysis

**Setup**: Complete at least 5 message exchanges

**Steps**:

1. Click "Get Consensus"
2. Wait for analysis

**Expected Results**:

- Consensus panel displays
- Shows areas of agreement
- Shows disagreements
- Provides compromise suggestions

**Verification**:

- [ ] Consensus computed within 5 seconds
- [ ] At least one agreement identified
- [ ] Disagreements are reasonable
- [ ] Consensus level calculated (0-1)

---

### Scenario 4: Discussion Summary

**Setup**: Complete full discussion (10+ messages)

**Steps**:

1. Click "Get Summary"
2. Wait for summary generation

**Expected Results**:

- Summary panel displays
- Key points listed
- Action items identified
- Next steps provided

**Verification**:

- [ ] Summary generated within 5 seconds
- [ ] Key points are relevant (3+)
- [ ] Action items are specific
- [ ] Summary captures main discussion points

---

## Postman Collections

### Collection: Group Discussion API

```json
{
  "info": {
    "name": "Group Discussion API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Initialize Discussion",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{base_url}}/api/discussions/initialize",
        "body": {
          "mode": "raw",
          "raw": "{\"topic\": \"AI Ethics\", \"selectedAgents\": [\"facilitator\", \"analyst\", \"advocate\"], \"context\": {}}"
        }
      }
    },
    {
      "name": "Send Message",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{base_url}}/api/discussions/{{sessionId}}/message",
        "body": {
          "mode": "raw",
          "raw": "{\"message\": \"What do you think?\", \"focusAgent\": null}"
        }
      }
    },
    {
      "name": "Get Consensus",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{base_url}}/api/discussions/{{sessionId}}/consensus"
      }
    },
    {
      "name": "Get Summary",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{base_url}}/api/discussions/{{sessionId}}/summary"
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001"
    },
    {
      "key": "token",
      "value": ""
    },
    {
      "key": "sessionId",
      "value": ""
    }
  ]
}
```

---

## Debugging Guide

### Enable Debug Logging

```javascript
// In server.js
process.env.DEBUG = "discussion:*,socket:*";

// In frontend
localStorage.setItem("debug", "discussionSocket:*");
```

### Common Issues & Solutions

| Issue                      | Cause                   | Solution                    |
| -------------------------- | ----------------------- | --------------------------- |
| WebSocket connection fails | Auth token invalid      | Refresh token and reconnect |
| Agent responses are empty  | API rate limit exceeded | Wait 60 seconds and retry   |
| Messages not persisting    | MongoDB not running     | Check MongoDB connection    |
| Slow agent responses       | Network latency         | Check internet connection   |
| Consensus not calculated   | Insufficient messages   | Add more messages first     |

### Logs to Monitor

```bash
# Terminal 1: Backend logs
npm run dev

# Terminal 2: Monitor WebSocket
DEBUG=socket:* npm run dev

# Terminal 3: Monitor agent service
DEBUG=discussion:agent npm run dev
```

---

**Testing Complete** ✅

All tests should pass before deploying to production!

---

**Last Updated**: January 2024  
**Test Coverage**: 95%+ recommended  
**Ready for**: Production Testing
