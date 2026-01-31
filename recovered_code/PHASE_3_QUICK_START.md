# 🚀 Phase 3 Quick Start Guide

**Get up and running with Group Discussion AI Agents in 5 minutes!**

---

## ⚡ Quick Start (5 minutes)

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output**:

```
✅ Server running on http://localhost:3001
✅ MongoDB connected
✅ Socket.io initialized at /discussions
```

### 2. Start Frontend

```bash
npm run dev
```

**Expected Output**:

```
✅ Frontend running on http://localhost:5173
✅ Vite ready
```

### 3. Open in Browser

```
http://localhost:5173/group-discussion
```

### 4. Start a Discussion

1. **Enter Topic**: "How can we improve team communication?"
2. **Select Agents**: Choose 3-5 agents
3. **Click Start**: Begin discussion
4. **Send Message**: "What's the best approach?"
5. **Watch**: Agents respond in real-time!

---

## 🎯 Key Commands

### Backend

```bash
npm run dev              # Start development server
npm test                 # Run tests
npm run build           # Production build
npm start               # Run production server
```

### Frontend

```bash
npm run dev             # Start development
npm run build           # Production build
npm test                # Run tests
npm run preview         # Preview build
```

---

## 📁 Key Files

| File                                       | Purpose             |
| ------------------------------------------ | ------------------- |
| `backend/services/groupDiscussionAgent.js` | Agent orchestration |
| `backend/routes/groupDiscussions.js`       | REST endpoints      |
| `backend/models/GroupDiscussionSession.js` | Database schema     |
| `backend/sockets/groupDiscussionSocket.js` | WebSocket handler   |
| `src/components/GroupDiscussion.tsx`       | Main component      |
| `src/services/discussionSocket.js`         | WebSocket client    |
| `src/services/api.js`                      | API wrapper         |

---

## 🔌 API Endpoints

### Initialize Discussion

```bash
curl -X POST http://localhost:3001/api/discussions/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Team productivity",
    "selectedAgents": ["facilitator", "analyst", "creative"],
    "context": {}
  }'
```

### Send Message

```bash
curl -X POST http://localhost:3001/api/discussions/SESSION_ID/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do you think?",
    "focusAgent": null
  }'
```

### Get Consensus

```bash
curl -X GET http://localhost:3001/api/discussions/SESSION_ID/consensus \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Summary

```bash
curl -X GET http://localhost:3001/api/discussions/SESSION_ID/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🌐 WebSocket Events

### Connect to Discussion

```javascript
import { discussionSocket } from "./services/discussionSocket";

// Connect
discussionSocket.connect(token);

// Join discussion
discussionSocket.joinDiscussion({ sessionId: "disc_123" });

// Send message
discussionSocket.sendMessage(sessionId, "Hello agents!");

// Ask agent
discussionSocket.askAgent(sessionId, "analyst", "What is your view?");

// Request consensus
discussionSocket.requestConsensus(sessionId);

// End discussion
discussionSocket.endDiscussion(sessionId);
```

### Listen to Events

```javascript
// New message
discussionSocket.on("new_message", (data) => {
  console.log(`${data.name}: ${data.message}`);
});

// Agent response
discussionSocket.on("agent_response", (data) => {
  console.log(`${data.name} responds: ${data.message}`);
});

// Consensus ready
discussionSocket.on("consensus_analysis", (data) => {
  console.log("Consensus:", data);
});

// Summary ready
discussionSocket.on("discussion_summary", (data) => {
  console.log("Summary:", data);
});
```

---

## 🎭 Agent Personalities

| Agent     | Type        | Specialty                |
| --------- | ----------- | ------------------------ |
| 🎤 Alex   | Facilitator | Leadership, Organization |
| 📊 Jordan | Analyst     | Logic, Data, Analysis    |
| 💡 Morgan | Creative    | Innovation, Strategy     |
| ⚙️ Casey  | Pragmatist  | Implementation, Realism  |
| ❓ Riley  | Advocate    | Critical Thinking, Risk  |

---

## 📊 API Response Examples

### Initialize Response

```json
{
  "sessionId": "disc_abc123",
  "topic": "Team productivity",
  "status": "active",
  "selectedAgents": [...],
  "openingStatement": "Thank you all for joining..."
}
```

### Message Response

```json
{
  "userMessage": {
    "agent": "user",
    "message": "What's your view?",
    "timestamp": "2024-01-15T10:35:00Z"
  },
  "agentResponses": [
    {
      "agent": "analyst",
      "name": "Jordan",
      "message": "From a logical perspective..."
    },
    {
      "agent": "creative",
      "name": "Morgan",
      "message": "Innovatively speaking..."
    }
  ]
}
```

### Consensus Response

```json
{
  "consensusAnalysis": {
    "areasOfAgreement": [...],
    "disagreements": [...],
    "compromises": [...],
    "overallConsensusLevel": 0.75
  }
}
```

---

## 🧪 Testing

### Quick Test

```bash
# Test endpoint
curl http://localhost:3001/api/discussions/agents/available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Full Integration Test

1. Navigate to http://localhost:5173/group-discussion
2. Enter topic: "Test discussion"
3. Select 3 agents
4. Click Start
5. Send 3 messages
6. Click "Get Consensus"
7. Click "Get Summary"
8. Click "End Discussion"

**Expected**: All steps complete without errors ✅

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check MongoDB
mongod --version

# Check port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux

# Clear old processes
npm run clean
npm run dev
```

### WebSocket Connection Fails

```javascript
// Check token validity
console.log(token);

// Check connection
discussionSocket.socket?.connected;

// Enable debug logs
localStorage.setItem("debug", "socket.io-client:*");
```

### No Agent Responses

```bash
# Check API key
echo $GEMINI_API_KEY

# Check MongoDB
mongo

# Check server logs
npm run dev  # Look for errors
```

### Slow Responses

- Wait for rate limits to reset (60 seconds)
- Check internet connection
- Monitor API response times in logs

---

## 📱 Frontend Components

### Using GroupDiscussion Component

```tsx
import GroupDiscussion from "./components/GroupDiscussion";

<GroupDiscussion />;
```

### Component Features

- ✅ 3-view interface (Setup, Discussion, Results)
- ✅ Real-time WebSocket integration
- ✅ Agent personality cards
- ✅ Progress tracking
- ✅ Consensus/Summary analysis
- ✅ Message history

---

## 💾 Database

### Check Discussions

```javascript
// MongoDB connection
const db = mongoose.connection.db;

// Query discussions
db.collection("groupdiscussionsessions")
  .find({})
  .toArray()
  .then((docs) => console.log(docs));
```

### Clear Test Data

```javascript
// Remove test discussions
db.collection("groupdiscussionsessions").deleteMany({
  topic: "Test discussion",
});
```

---

## 🔐 Authentication

### Get Token

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Returns: { token: "eyJhbGc..." }
```

### Use Token

```bash
curl http://localhost:3001/api/discussions/agents/available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📈 Performance Tips

1. **Limit Agents**: Use 3-5 agents per discussion (fewer = faster)
2. **Message Length**: Keep messages under 500 characters
3. **Batch Requests**: Wait for previous response before next message
4. **Cache Results**: Store agent list locally after first fetch
5. **Optimize WebSocket**: Reconnect on network change

---

## 🆘 Get Help

### Check Documentation

- 📄 [Phase 3 Complete Implementation](./PHASE_3_COMPLETE_IMPLEMENTATION.md)
- 📚 [API Reference](./PHASE_3_API_REFERENCE.md)
- 🧪 [Testing Guide](./PHASE_3_TESTING_GUIDE.md)
- 📊 [Final Summary](./PHASE_3_FINAL_SUMMARY.md)

### Debug Mode

```javascript
// Enable all debug logs
localStorage.setItem("debug", "*");

// Enable specific component
process.env.DEBUG = "discussion:*";
```

### Common Error Codes

| Code | Meaning             | Fix               |
| ---- | ------------------- | ----------------- |
| 401  | Unauthorized        | Check token       |
| 404  | Not found           | Check session ID  |
| 500  | Server error        | Check server logs |
| 503  | Service unavailable | Check Gemini API  |

---

## 🎯 Next Steps

1. ✅ **Start servers** (backend + frontend)
2. ✅ **Open browser** and navigate to group discussion
3. ✅ **Create first discussion** with your topic
4. ✅ **Send 5+ messages** and watch agents respond
5. ✅ **Request consensus** to see analysis
6. ✅ **Get summary** to see key points
7. ✅ **End discussion** to save to database

---

## 📊 Success Checklist

- [ ] Backend server running (Port 3001)
- [ ] Frontend server running (Port 5173)
- [ ] MongoDB connected
- [ ] Can navigate to group discussion page
- [ ] Can create a new discussion
- [ ] Can send messages
- [ ] Agents respond in real-time
- [ ] Can get consensus analysis
- [ ] Can get discussion summary
- [ ] Can end discussion successfully

---

## 🎉 You're All Set!

**Now go create awesome discussions with AI agents!** 🚀

---

## 💡 Pro Tips

- **Tip 1**: Use all 5 agents for diverse perspectives
- **Tip 2**: Send 10+ messages for better consensus analysis
- **Tip 3**: Ask focused questions to specific agents
- **Tip 4**: Export summaries for team sharing
- **Tip 5**: Create discussions for brainstorming and decision-making

---

**Version**: 1.0  
**Last Updated**: January 2024  
**Status**: Production Ready ✅

---

**Quick Links**:

- 🏠 [Home](./README.md)
- 📖 [Full Documentation](./PHASE_3_COMPLETE_IMPLEMENTATION.md)
- 🔌 [API Reference](./PHASE_3_API_REFERENCE.md)
- 🧪 [Testing Guide](./PHASE_3_TESTING_GUIDE.md)
- 📊 [Project Summary](./PHASE_3_FINAL_SUMMARY.md)
