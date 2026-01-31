# 🔌 Phase 3 - Group Discussion API Reference

---

## REST API Endpoints

### 1. Initialize Discussion

**Endpoint**: `POST /api/discussions/initialize`

**Authentication**: Required (Bearer Token)

**Request Body**:

```json
{
  "topic": "Team productivity improvements",
  "selectedAgents": ["facilitator", "analyst", "creative"],
  "context": {
    "teamSize": 10,
    "remote": true,
    "currentChallenges": "coordination"
  }
}
```

**Response** (200):

```json
{
  "sessionId": "disc_12345abcde",
  "topic": "Team productivity improvements",
  "selectedAgents": [
    {
      "type": "facilitator",
      "name": "Alex",
      "role": "Group Discussion Moderator",
      "expertise": ["Leadership", "Time Management", "Conflict Resolution"],
      "style": "Encouraging, Organized, Fair"
    },
    {
      "type": "analyst",
      "name": "Jordan",
      "role": "Data & Logic Analyst",
      "expertise": ["Data Analysis", "Logic", "Problem Solving"],
      "style": "Detail-oriented, Logical, Precise"
    },
    {
      "type": "creative",
      "name": "Morgan",
      "role": "Innovation & Strategy Lead",
      "expertise": ["Innovation", "Strategy", "Out-of-the-box Thinking"],
      "style": "Visionary, Enthusiastic, Unconventional"
    }
  ],
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "openingStatement": "Thank you all for joining this discussion on team productivity improvements. I'm excited to hear diverse perspectives on how we can enhance our collective output..."
}
```

**Error Response** (400):

```json
{
  "error": "Invalid agent selection",
  "message": "Selected agents do not exist"
}
```

---

### 2. Send Message to Discussion

**Endpoint**: `POST /api/discussions/:sessionId/message`

**Parameters**:

- `sessionId`: Discussion session ID (path parameter)

**Request Body**:

```json
{
  "message": "How can we improve our sprint velocity?",
  "focusAgent": "analyst"
}
```

**Response** (200):

```json
{
  "userMessage": {
    "agent": "user",
    "name": "User",
    "message": "How can we improve our sprint velocity?",
    "timestamp": "2024-01-15T10:35:00Z"
  },
  "agentResponses": [
    {
      "agent": "analyst",
      "name": "Jordan",
      "message": "Sprint velocity is typically measured by the story points completed per sprint. To improve it, we should analyze: 1) Historical velocity trends, 2) Bottlenecks in the development process, 3) Team skill gaps...",
      "timestamp": "2024-01-15T10:35:05Z"
    },
    {
      "agent": "pragmatist",
      "name": "Casey",
      "message": "From a practical standpoint, velocity improvements require incremental changes. I'd recommend: tracking current velocity baseline, identifying one blocker to remove, implementing that change, measuring impact...",
      "timestamp": "2024-01-15T10:35:07Z"
    },
    {
      "agent": "creative",
      "name": "Morgan",
      "message": "What if we approached this differently? Instead of just fixing bottlenecks, what if we reimagined our sprint structure? Shorter sprints, async standups, or rotating sprint focuses...",
      "timestamp": "2024-01-15T10:35:09Z"
    }
  ],
  "progress": {
    "totalTurns": 3,
    "duration": "5m 30s",
    "agentsResponded": 3,
    "messagesReceived": 4
  }
}
```

**Optional Query Parameters**:

- `focusAgent`: Only get response from specific agent
- `maxAgents`: Maximum agents to respond (default: 3)

---

### 3. Ask Specific Agent

**Endpoint**: `POST /api/discussions/:sessionId/ask-agent`

**Request Body**:

```json
{
  "agentType": "facilitator",
  "question": "Can you summarize what we've discussed so far?"
}
```

**Response** (200):

```json
{
  "question": "Can you summarize what we've discussed so far?",
  "askedAgent": "facilitator",
  "agentName": "Alex",
  "response": "Absolutely! Here's what we've covered: First, Jordan emphasized the importance of data-driven decision making for improving velocity, focusing on historical trends and bottleneck analysis. Casey suggested a practical, incremental approach starting with baseline tracking and removing one blocker at a time. Morgan proposed innovative ideas around restructuring the sprint process itself...",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

---

### 4. Get Consensus Analysis

**Endpoint**: `GET /api/discussions/:sessionId/consensus`

**Query Parameters**:

- `detailed`: Return detailed analysis (boolean, default: true)

**Response** (200):

```json
{
  "consensusAnalysis": {
    "areasOfAgreement": [
      {
        "topic": "Importance of tracking velocity",
        "supportedBy": ["analyst", "pragmatist"],
        "description": "All agents agree that measuring and tracking sprint velocity is essential for improvement"
      },
      {
        "topic": "Need for incremental changes",
        "supportedBy": ["pragmatist", "analyst"],
        "description": "Consensus that changes should be gradual and measurable, not revolutionary"
      }
    ],
    "disagreements": [
      {
        "topic": "Scope of changes",
        "position1": {
          "agent": "creative",
          "view": "Need fundamental restructuring of sprint process"
        },
        "position2": {
          "agent": "pragmatist",
          "view": "Should optimize existing processes incrementally"
        }
      }
    ],
    "compromises": [
      {
        "topic": "Change approach",
        "compromise": "Start with incremental improvements, but reserve 20% of sprint for experimenting with innovative approaches"
      }
    ],
    "unresolvedIssues": ["Optimal sprint length for different team types"],
    "overallConsensusLevel": 0.75
  }
}
```

---

### 5. Get Discussion Summary

**Endpoint**: `GET /api/discussions/:sessionId/summary`

**Query Parameters**:

- `format`: 'detailed' | 'concise' | 'markdown' (default: 'detailed')

**Response** (200):

```json
{
  "summary": {
    "discussionTopic": "Team productivity improvements",
    "keyPoints": [
      "Sprint velocity is measurable and can be systematically improved",
      "Data-driven decision making is essential for identifying bottlenecks",
      "Changes should be incremental and measurable",
      "Innovation in process design can complement traditional optimization"
    ],
    "mainConclusions": [
      "The team should establish a baseline velocity metric",
      "Identify one primary bottleneck to address first",
      "Implement changes incrementally with measurement between each iteration",
      "Consider reserving time for experimental process improvements"
    ],
    "actionItems": [
      "Establish current sprint velocity baseline (2 sprints)",
      "Conduct bottleneck analysis with team (1 day)",
      "Implement first improvement and measure impact (1 sprint)",
      "Plan experimental sprint structure (2 weeks)"
    ],
    "nextSteps": [
      "Share findings with wider team",
      "Get stakeholder approval for changes",
      "Implement baseline tracking",
      "Schedule review after 3 sprints"
    ],
    "agentPerspectives": {
      "analyst": "Provided data-driven insights on measuring velocity and identifying patterns",
      "pragmatist": "Emphasized practical implementation and realistic timelines",
      "creative": "Proposed innovative approaches to process restructuring",
      "facilitator": "Guided discussion and ensured all voices were heard",
      "advocate": "Challenged assumptions and identified risks"
    }
  }
}
```

---

### 6. End Discussion

**Endpoint**: `POST /api/discussions/:sessionId/end`

**Request Body** (optional):

```json
{
  "notes": "Great discussion with valuable insights"
}
```

**Response** (200):

```json
{
  "sessionId": "disc_12345abcde",
  "status": "completed",
  "completedAt": "2024-01-15T10:50:00Z",
  "finalReport": {
    "duration": "20 minutes",
    "totalMessages": 15,
    "userMessages": 5,
    "agentMessages": 10,
    "agentParticipation": {
      "facilitator": 3,
      "analyst": 4,
      "creative": 2,
      "pragmatist": 3,
      "advocate": 2
    },
    "averageMessageLength": 150,
    "summary": {..},
    "consensus": {..},
    "recommendations": [
      "This discussion generated 4 concrete action items",
      "Strong agreement on measurement methodology",
      "Consider hybrid approach combining innovation with pragmatism"
    ]
  }
}
```

---

### 7. Get Available Agents

**Endpoint**: `GET /api/discussions/agents/available`

**Response** (200):

```json
{
  "agents": [
    {
      "type": "facilitator",
      "name": "Alex",
      "role": "Group Discussion Moderator",
      "expertise": [
        "Leadership",
        "Time Management",
        "Conflict Resolution",
        "Fairness",
        "Organization"
      ],
      "style": "Encouraging, Organized, Fair",
      "color": "#3b82f6",
      "description": "Keeps discussions on track and ensures all voices are heard"
    },
    {
      "type": "analyst",
      "name": "Jordan",
      "role": "Data & Logic Analyst",
      "expertise": [
        "Data Analysis",
        "Logic",
        "Problem Solving",
        "Research",
        "Precision"
      ],
      "style": "Detail-oriented, Logical, Precise",
      "color": "#10b981",
      "description": "Breaks down problems and demands evidence"
    },
    {
      "type": "creative",
      "name": "Morgan",
      "role": "Innovation & Strategy Lead",
      "expertise": [
        "Innovation",
        "Strategy",
        "Vision",
        "Creativity",
        "Future Thinking"
      ],
      "style": "Visionary, Enthusiastic, Unconventional",
      "color": "#f59e0b",
      "description": "Proposes innovative solutions and thinks strategically"
    },
    {
      "type": "pragmatist",
      "name": "Casey",
      "role": "Implementation & Feasibility Expert",
      "expertise": [
        "Practical Implementation",
        "Risk Management",
        "Resource Planning",
        "Realism",
        "Grounding"
      ],
      "style": "Practical, Realistic, Grounded",
      "color": "#8b5cf6",
      "description": "Assesses feasibility and identifies real-world obstacles"
    },
    {
      "type": "advocate",
      "name": "Riley",
      "role": "Critical Evaluator",
      "expertise": [
        "Critical Thinking",
        "Risk Assessment",
        "Alternative Perspectives",
        "Devil's Advocacy",
        "Thoroughness"
      ],
      "style": "Challenging, Skeptical, Thorough",
      "color": "#ef4444",
      "description": "Questions assumptions and identifies weaknesses"
    }
  ]
}
```

---

### 8. Get Discussion History

**Endpoint**: `GET /api/discussions/history/:discussionId`

**Query Parameters**:

- `limit`: Maximum messages to return (default: 100)
- `offset`: Skip messages (default: 0)
- `format`: 'full' | 'messages_only' (default: 'full')

**Response** (200):

```json
{
  "discussionId": "disc_12345abcde",
  "topic": "Team productivity improvements",
  "fullHistory": [
    {
      "id": "msg_001",
      "agent": "facilitator",
      "name": "Alex",
      "message": "Thank you all for joining...",
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "opening"
    },
    {
      "id": "msg_002",
      "agent": "user",
      "name": "User",
      "message": "How can we improve our sprint velocity?",
      "timestamp": "2024-01-15T10:35:00Z",
      "type": "message"
    },
    {
      "id": "msg_003",
      "agent": "analyst",
      "name": "Jordan",
      "message": "Sprint velocity is typically measured...",
      "timestamp": "2024-01-15T10:35:05Z",
      "type": "response"
    }
  ],
  "metadata": {
    "totalMessages": 15,
    "userMessages": 5,
    "agentMessages": 10,
    "duration": "20 minutes",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:50:00Z"
  }
}
```

---

### 9. Get User's Discussions

**Endpoint**: `GET /api/discussions/user/all`

**Query Parameters**:

- `limit`: Maximum results (default: 20)
- `offset`: Skip results (default: 0)
- `status`: Filter by status ('active' | 'completed' | 'archived')
- `sort`: Sort by ('created' | 'updated' | 'duration') (default: 'created')

**Response** (200):

```json
{
  "discussions": [
    {
      "discussionId": "disc_12345abcde",
      "topic": "Team productivity improvements",
      "status": "completed",
      "selectedAgents": ["facilitator", "analyst", "creative"],
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:50:00Z",
      "duration": "20 minutes",
      "messageCount": 15,
      "summary": "Discussed productivity improvements with focus on sprint velocity..."
    },
    {
      "discussionId": "disc_99999zyxwv",
      "topic": "Remote work best practices",
      "status": "completed",
      "selectedAgents": ["facilitator", "pragmatist", "advocate"],
      "createdAt": "2024-01-14T14:20:00Z",
      "completedAt": "2024-01-14T14:45:00Z",
      "duration": "25 minutes",
      "messageCount": 18,
      "summary": "Explored remote work practices with emphasis on team cohesion..."
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## WebSocket Events

### Client → Server Events

#### 1. join_discussion

**Purpose**: Join a discussion room

**Emit**:

```javascript
socket.emit("join_discussion", {
  sessionId: "disc_12345abcde",
  userName: "John Doe",
});
```

**Server Response**:

```javascript
socket.on("user_joined", {
  sessionId: "disc_12345abcde",
  userName: "John Doe",
  participantCount: 3,
});
```

---

#### 2. user_message

**Purpose**: Send message to discussion

**Emit**:

```javascript
socket.emit("user_message", {
  sessionId: "disc_12345abcde",
  message: "What about implementing this change incrementally?",
  focusAgent: null,
});
```

**Server Broadcasts**:

```javascript
socket.on("new_message", {
  agent: "user",
  name: "John Doe",
  message: "What about implementing this change incrementally?",
  timestamp: "2024-01-15T10:35:00Z",
});

// Followed by agent responses...
socket.on("agent_response", {
  agent: "pragmatist",
  name: "Casey",
  message: "That's an excellent point. Incremental implementation...",
  timestamp: "2024-01-15T10:35:05Z",
});
```

---

#### 3. ask_agent

**Purpose**: Ask specific agent a question

**Emit**:

```javascript
socket.emit("ask_agent", {
  sessionId: "disc_12345abcde",
  agentType: "creative",
  question: "Can you propose a bold new approach?",
});
```

**Server Broadcasts**:

```javascript
socket.on("direct_question", {
  askedAgent: "creative",
  agentName: "Morgan",
  question: "Can you propose a bold new approach?",
});

socket.on("direct_answer", {
  agent: "creative",
  name: "Morgan",
  answer: "Absolutely! Here's a bold approach...",
});
```

---

#### 4. request_consensus

**Purpose**: Request consensus analysis

**Emit**:

```javascript
socket.emit("request_consensus", {
  sessionId: "disc_12345abcde",
});
```

**Server Response**:

```javascript
socket.on('consensus_analysis', {
  areasOfAgreement: [...],
  disagreements: [...],
  compromises: [...],
  overallConsensusLevel: 0.75
});
```

---

#### 5. request_summary

**Purpose**: Request discussion summary

**Emit**:

```javascript
socket.emit("request_summary", {
  sessionId: "disc_12345abcde",
  format: "detailed",
});
```

**Server Response**:

```javascript
socket.on('discussion_summary', {
  summary: {...},
  keyPoints: [...],
  actionItems: [...],
  nextSteps: [...]
});
```

---

#### 6. end_discussion

**Purpose**: End the discussion

**Emit**:

```javascript
socket.emit("end_discussion", {
  sessionId: "disc_12345abcde",
  notes: "Excellent discussion",
});
```

**Server Response**:

```javascript
socket.on('discussion_ended', {
  sessionId: 'disc_12345abcde',
  status: 'completed',
  finalReport: {...}
});
```

---

#### 7. typing

**Purpose**: Send typing indicator

**Emit**:

```javascript
socket.emit("typing", {
  sessionId: "disc_12345abcde",
  userName: "John Doe",
});
```

**Server Broadcasts**:

```javascript
socket.on("user_typing", {
  userName: "John Doe",
});
```

---

#### 8. stop_typing

**Purpose**: Stop typing indicator

**Emit**:

```javascript
socket.emit("stop_typing", {
  sessionId: "disc_12345abcde",
});
```

**Server Broadcasts**:

```javascript
socket.on("user_stopped_typing", {
  userName: "John Doe",
});
```

---

#### 9. request_agent_list

**Purpose**: Get list of available agents

**Emit**:

```javascript
socket.emit("request_agent_list", {
  sessionId: "disc_12345abcde",
});
```

**Server Response**:

```javascript
socket.on('agent_list', {
  agents: [...]
});
```

---

#### 10. disconnect

**Purpose**: Disconnect from discussion

**Emit**:

```javascript
socket.disconnect();
```

**Server Broadcasts**:

```javascript
socket.on("user_left", {
  userName: "John Doe",
  participantCount: 2,
});
```

---

## Error Responses

### Common HTTP Error Codes

```javascript
// 400 Bad Request
{
  "error": "INVALID_REQUEST",
  "message": "Missing required fields: selectedAgents"
}

// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token expired"
}

// 404 Not Found
{
  "error": "SESSION_NOT_FOUND",
  "message": "Discussion session disc_xyz not found"
}

// 429 Too Many Requests
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Try again in 60 seconds"
}

// 500 Server Error
{
  "error": "SERVER_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req_12345"
}
```

### WebSocket Error Events

```javascript
socket.on('error', {
  code: 'SOCKET_ERROR',
  message: 'Failed to process message',
  details: {...}
});
```

---

## Rate Limits

| Endpoint              | Limit  | Window      |
| --------------------- | ------ | ----------- |
| Initialize Discussion | 10/min | Per user    |
| Send Message          | 30/min | Per session |
| Ask Agent             | 20/min | Per session |
| Consensus Analysis    | 5/min  | Per session |
| Summary Generation    | 5/min  | Per session |

---

## Authentication

All REST endpoints require Bearer token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

WebSocket connections authenticate via query parameter:

```javascript
const socket = io("http://localhost:3001/discussions", {
  query: {
    token: "<your_jwt_token>",
  },
});
```

---

## Example Integration

### Initialize and Start Discussion

```javascript
// Initialize
const initResponse = await fetch("/api/discussions/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    topic: "AI future trends",
    selectedAgents: ["analyst", "creative", "advocate"],
  }),
});

const { sessionId } = await initResponse.json();

// Connect WebSocket
const socket = io("/discussions", {
  query: { token },
});

socket.emit("join_discussion", { sessionId });

// Send message
socket.emit("user_message", {
  sessionId,
  message: "What are the biggest AI risks we should consider?",
});

// Listen for responses
socket.on("agent_response", (data) => {
  console.log(`${data.name}: ${data.message}`);
});
```

---

## Complete Reference Table

| Operation         | Method | Endpoint                          | Real-time |
| ----------------- | ------ | --------------------------------- | --------- |
| Create Discussion | POST   | /api/discussions/initialize       | ❌        |
| Send Message      | POST   | /api/discussions/:id/message      | ✅        |
| Ask Agent         | POST   | /api/discussions/:id/ask-agent    | ✅        |
| Get Consensus     | GET    | /api/discussions/:id/consensus    | ❌        |
| Get Summary       | GET    | /api/discussions/:id/summary      | ❌        |
| End Discussion    | POST   | /api/discussions/:id/end          | ❌        |
| List Agents       | GET    | /api/discussions/agents/available | ❌        |
| Get History       | GET    | /api/discussions/history/:id      | ❌        |
| User Discussions  | GET    | /api/discussions/user/all         | ❌        |

---

**Last Updated**: January 2024  
**API Version**: v1.0  
**Status**: Production Ready ✅
