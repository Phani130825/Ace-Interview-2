# InterviewAI - AI-Powered Interview Preparation Platform

> A comprehensive, production-ready AI interview preparation platform featuring multi-agent systems, real-time simulations, and intelligent feedback mechanisms.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [AI Agents System](#-ai-agents-system)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## Features

### Interview Simulations

- **Technical Interviews** - DSA, system design, code reviews
- **HR Interviews** - Behavioral questions, culture fit
- **Managerial Interviews** - Leadership, team management
- **Aptitude Tests** - Logical reasoning, quantitative aptitude
- **Coding Rounds** - Live code editor with Monaco (VS Code-like)
- **Group Discussions** - Multi-AI agent collaborative discussions

### AI-Powered Intelligence

- **Speech Recognition** - Real-time voice-to-text
- **Text-to-Speech** - Natural AI interviewer responses
- **Smart Feedback** - Personalized performance analysis
- **Resume Parser** - Intelligent resume analysis and optimization
- **Multi-Agent System** - 3 Phase implementation with 9+ AI agents
- **Adaptive Difficulty** - Dynamic question difficulty adjustment

### Analytics & Tracking

- **Performance Dashboard** - Comprehensive progress tracking
- **Score Breakdowns** - Detailed performance metrics
- **Learning Roadmaps** - AI-generated improvement plans
- **Session History** - Complete interview history
- **Progress Reports** - Visual performance analytics

### Modern UI/UX

- **Responsive Design** - Mobile, tablet, desktop optimized
- **Dark Mode Support** - Theme switching capability
- **Real-time Updates** - WebSocket-powered live interactions
- **Accessible** - WCAG compliant components
- **Beautiful Charts** - Recharts visualizations

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                            │
├────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                                  │
│  ├─ Pages: Dashboard, Interviews, Reports                      │
│  ├─ Components: 50+ Reusable UI Components                     │
│  ├─ Services: API Client, Auth, WebSocket                      │
│  └─ State: Context API, React Query                            │
└────────────────────────────────────────────────────────────────┘
                           ↕ HTTP/WebSocket
┌────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express)                       │
├────────────────────────────────────────────────────────────────┤
│  Node.js + Express.js                                          │
│  ├─ Authentication: JWT + bcrypt                               │
│  ├─ Rate Limiting: Express Rate Limit                          │
│  ├─ Security: Helmet, CORS                                     │
│  └─ WebSocket: Socket.io                                       │
└────────────────────────────────────────────────────────────────┘
                           ↕
┌────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                        │
├────────────────────────────────────────────────────────────────┤
│  Phase 1: Core Interview Agents (3 agents)                     │
│  ├─ Interview Agent: Question generation                       │
│  ├─ Resume Agent: CV analysis & optimization                   │
│  └─ Analysis Agent: Performance evaluation                     │
│                                                                 │
│  Phase 2: Placement Simulation Agents (3 agents)               │
│  ├─ Mentor Agent: Learning roadmaps                            │
│  ├─ Company Agent: Company profile matching                    │
│  └─ Task Agent: Autonomous planning                            │
│                                                                 │
│  Phase 3: Group Discussion Agents (5 agents)                   │
│  ├─ Facilitator (Alex): Discussion leadership                  │
│  ├─ Analyst (Jordan): Data-driven insights                     │
│  ├─ Creative (Morgan): Innovative thinking                     │
│  ├─ Pragmatist (Casey): Practical solutions                    │
│  └─ Advocate (Riley): Critical evaluation                      │
└────────────────────────────────────────────────────────────────┘
                           ↕
┌────────────────────────────────────────────────────────────────┐
│                    AI SERVICE LAYER                            │
├────────────────────────────────────────────────────────────────┤
│  Gemini AI Integration (gemini-2.5-flash)                      │
│  ├─ Structured Prompts                                         │
│  ├─ Context Management                                         │
│  ├─ Response Streaming                                         │
│  └─ Rate Limiting & Retry Logic                                │
└────────────────────────────────────────────────────────────────┘
                           ↕
┌────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (MongoDB)                        │
├────────────────────────────────────────────────────────────────┤
│  Collections:                                                   │
│  ├─ Users: Authentication & profiles                           │
│  ├─ AIInterviewSessions: Interview records                     │
│  ├─ PlacementSimulations: Placement data                       │
│  ├─ GroupDiscussionSessions: Discussion logs                   │
│  ├─ AptitudeTests: Test results                                │
│  ├─ Resumes: Parsed resume data                                │
│  └─ Pipelines: Task automation                                 │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Frontend (React Component)                              │
│     ├─ User starts interview                                │
│     ├─ Component state updates                              │
│     └─ API call triggered                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. API Service Layer (axios)                               │
│     ├─ Request formatting                                   │
│     ├─ JWT token attachment                                 │
│     └─ HTTP POST/GET                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Backend Routes (Express)                                │
│     ├─ Authentication middleware                            │
│     ├─ Request validation                                   │
│     └─ Route to service                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Agent Services (AI Logic)                               │
│     ├─ Context preparation                                  │
│     ├─ Gemini AI API call                                   │
│     └─ Response processing                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Database (MongoDB)                                      │
│     ├─ Store session data                                   │
│     ├─ Update user progress                                 │
│     └─ Save analysis results                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Response to Frontend                                     │
│     ├─ Format response                                      │
│     ├─ Send via HTTP/WebSocket                              │
│     └─ Update UI                                            │
└─────────────────────────────────────────────────────────────┘
```

### WebSocket Real-Time Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               GROUP DISCUSSION SYSTEM                       │
└─────────────────────────────────────────────────────────────┘

Client                    Server                    AI Agents
  │                         │                          │
  │─── join_discussion ────>│                          │
  │                         │─── Initialize Session ──>│
  │<─── agent_list ─────────│                          │
  │                         │                          │
  │─── user_message ───────>│                          │
  │<─── message_sent ───────│                          │
  │                         │─── Process & Route ─────>│
  │                         │<─── Agent Response ──────│
  │<─── agent_response ─────│                          │
  │                         │                          │
  │─── ask_agent ──────────>│                          │
  │                         │─── Direct Question ─────>│
  │<─── agent_response ─────│<─── Targeted Reply ─────│
  │                         │                          │
  │─── request_consensus ──>│                          │
  │                         │─── Analyze All Agents ──>│
  │<─── consensus_ready ────│<─── Consensus Data ─────│
  │                         │                          │
  │─── request_summary ────>│                          │
  │                         │─── Generate Summary ────>│
  │<─── summary_ready ──────│<─── Summary Data ───────│
  │                         │                          │
  │─── end_discussion ─────>│                          │
  │                         │─── Save & Cleanup ──────>│
  │<─── discussion_ended ───│                          │
```

---

## Tech Stack

### Frontend

| Technology       | Version | Purpose           |
| ---------------- | ------- | ----------------- |
| React            | 18.3+   | UI framework      |
| TypeScript       | 5.8+    | Type safety       |
| Vite             | 5.4+    | Build tool        |
| Tailwind CSS     | 3.4+    | Styling           |
| shadcn/ui        | Latest  | Component library |
| React Router     | 6.30+   | Routing           |
| React Query      | 5.83+   | Data fetching     |
| Socket.io Client | 4.7+    | WebSocket         |
| Monaco Editor    | 4.7+    | Code editor       |
| Recharts         | 2.15+   | Charts            |
| Axios            | 1.11+   | HTTP client       |

### Backend

| Technology | Version | Purpose          |
| ---------- | ------- | ---------------- |
| Node.js    | 20+     | Runtime          |
| Express.js | 4.18+   | Web framework    |
| MongoDB    | 8.0+    | Database         |
| Mongoose   | 8.0+    | ODM              |
| Socket.io  | 4.7+    | WebSocket        |
| JWT        | 9.0+    | Authentication   |
| bcryptjs   | 2.4+    | Password hashing |
| Helmet     | 7.1+    | Security         |
| Morgan     | 1.10+   | Logging          |
| Multer     | 1.4+    | File uploads     |

### AI/ML

| Technology       | Version   | Purpose            |
| ---------------- | --------- | ------------------ |
| Google Gemini AI | 2.5-flash | AI inference       |
| Web Speech API   | -         | Speech recognition |
| Speech Synthesis | -         | Text-to-speech     |
| PDF Parse        | 1.1+      | Resume parsing     |
| Mammoth          | 1.6+      | DOCX parsing       |

### DevOps & Tools

| Technology  | Version | Purpose              |
| ----------- | ------- | -------------------- |
| Git         | -       | Version control      |
| ESLint      | 9.32+   | Code linting         |
| Jest        | 29.7+   | Testing              |
| Nodemon     | 3.0+    | Dev server           |
| Compression | 1.7+    | Response compression |

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm ([Install via nvm](https://github.com/nvm-sh/nvm))
- **MongoDB** Atlas account or local instance
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start (5 Minutes)

1. **Clone the repository**

```bash
git clone <YOUR_REPO_URL>
cd Ace\ Interviews/recovered_code
```

2. **Install dependencies**

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

3. **Environment Setup**

Create `.env` in `backend/` directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/interviewai

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-here

# Server
PORT=5000
NODE_ENV=development

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# Email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary (optional - for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Create `.env` in root directory:

```env
# Frontend API URLs
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000
```

4. **Start the application**

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd ..
npm run dev
```

5. **Open your browser**

```
http://localhost:5173
```

**You're ready to go!**

---

## 📁 Project Structure

```
recovered_code/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── InterviewSimulation.tsx
│   │   ├── TechnicalInterviewSimulator.tsx
│   │   ├── HRInterviewSimulator.tsx
│   │   ├── ManagerialInterviewSimulator.tsx
│   │   ├── CodingRound.tsx       # Monaco editor integration
│   │   ├── Aptitude.tsx          # Aptitude tests
│   │   ├── GroupDiscussion.tsx   # Multi-agent discussions
│   │   ├── PlacementSimulation.tsx
│   │   ├── ResumeOptimizer.tsx
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/                    # Page components
│   │   ├── Index.tsx             # Landing page
│   │   └── NotFound.tsx
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx       # Authentication
│   ├── services/                 # API services
│   │   ├── api.js                # API client
│   │   └── discussionSocket.js   # WebSocket client
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript types
│   ├── lib/                      # Utilities
│   └── workers/                  # Web workers
│
├── backend/                      # Backend source
│   ├── server.js                 # Express app entry
│   ├── config/                   # Configuration
│   │   └── database.js           # MongoDB connection
│   ├── models/                   # Mongoose models
│   │   ├── User.js
│   │   ├── AIInterviewSession.js
│   │   ├── PlacementSimulation.js
│   │   ├── GroupDiscussionSession.js
│   │   ├── AptitudeTest.js
│   │   └── Resume.js
│   ├── routes/                   # API routes
│   │   ├── auth.js               # Authentication
│   │   ├── interviews.js         # Interview endpoints
│   │   ├── aptitude.js           # Aptitude tests
│   │   ├── agents.js             # AI agents (Phase 1 & 2)
│   │   ├── groupDiscussions.js   # Group discussions (Phase 3)
│   │   └── resume.js             # Resume operations
│   ├── services/                 # Business logic
│   │   ├── aiService.js          # Core AI service
│   │   ├── interviewAgent.js     # Interview agent
│   │   ├── resumeAgent.js        # Resume agent
│   │   ├── analysisAgent.js      # Analysis agent
│   │   ├── mentorAgent.js        # Mentor agent (Phase 2)
│   │   ├── companySimulationAgent.js  # Company agent
│   │   ├── autonomousTaskAgent.js     # Task agent
│   │   └── groupDiscussionAgent.js    # GD agent (Phase 3)
│   ├── sockets/                  # WebSocket handlers
│   │   └── groupDiscussionSocket.js
│   ├── middleware/               # Express middleware
│   │   ├── auth.js               # JWT verification
│   │   └── errorHandler.js       # Error handling
│   ├── scripts/                  # Utility scripts
│   └── __tests__/                # Jest tests
│
├── public/                       # Static assets
├── scripts/                      # Build/deploy scripts
└── Documentation files (50+)     # Comprehensive docs
```

---

## AI Agents System

### Phase 1: Core Interview System (3 Agents)

#### 1. Interview Agent

**Purpose**: Generate contextual interview questions

- Technical question generation
- Adaptive difficulty
- Domain-specific questions
- Follow-up question logic

#### 2. Resume Agent

**Purpose**: Parse and analyze resumes

- PDF/DOCX parsing
- Skill extraction
- Experience analysis
- Resume optimization suggestions

#### 3. Analysis Agent

**Purpose**: Evaluate interview performance

- Answer quality scoring
- Technical accuracy assessment
- Communication evaluation
- Detailed feedback generation

### Phase 2: Placement Simulation (3 Agents)

#### 4. Mentor Agent

**Purpose**: Personalized learning guidance

- Performance analysis
- Learning roadmap generation
- Progress tracking
- Improvement recommendations

**Endpoints**:

- `POST /api/agents/mentor/analyze-placement`
- `POST /api/agents/mentor/generate-roadmap`
- `POST /api/agents/mentor/recommendations`
- `POST /api/agents/mentor/track-progress`

#### 5. Company Simulation Agent

**Purpose**: Company profile matching

- Company profile creation
- Culture fit analysis
- Question customization
- Behavioral assessment

**Endpoints**:

- `POST /api/agents/company/create-profile`
- `POST /api/agents/company/generate-questions`
- `POST /api/agents/company/behavioral-questions`
- `POST /api/agents/company/analyze-fit`

#### 6. Autonomous Task Agent

**Purpose**: Automated task management

- Interview scheduling
- Difficulty adjustment
- Task automation
- Notification system

**Endpoints**:

- `POST /api/agents/task/generate-plan`
- `POST /api/agents/task/schedule-interviews`
- `POST /api/agents/task/adjust-difficulty`
- `POST /api/agents/task/send-notification`

### Phase 3: Group Discussion System (5 Agents)

#### 7-11. Discussion Agents

| Agent                  | Personality                       | Role                         |
| ---------------------- | --------------------------------- | ---------------------------- |
| **Alex** (Facilitator) | Organized, Leadership-focused     | Guides discussion flow       |
| **Jordan** (Analyst)   | Logical, Data-driven              | Provides analytical insights |
| **Morgan** (Creative)  | Innovative, Strategic             | Generates creative solutions |
| **Casey** (Pragmatist) | Practical, Implementation-focused | Evaluates feasibility        |
| **Riley** (Advocate)   | Critical, Risk-aware              | Challenges assumptions       |

**Features**:

- Real-time multi-agent conversations
- WebSocket-based communication
- Consensus analysis
- Automated summaries
- Turn-based orchestration

**WebSocket Events**: 10 events
**REST Endpoints**: 9 endpoints

---

## 📡 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/refresh
```

### Interview Endpoints

```http
POST   /api/interviews/start
POST   /api/interviews/:id/submit-answer
GET    /api/interviews/:id
GET    /api/interviews/user/:userId
PUT    /api/interviews/:id/end
DELETE /api/interviews/:id
```

### Aptitude Test Endpoints

```http
POST /api/aptitude/generate-questions
POST /api/aptitude/submit
GET  /api/aptitude/results/:testId
```

### Resume Endpoints

```http
POST /api/resume/upload
POST /api/resume/parse
GET  /api/resume/:userId
PUT  /api/resume/:id/optimize
```

### Agent Endpoints (Phase 1-2)

```http
# Mentor Agent
POST /api/agents/mentor/analyze-placement
POST /api/agents/mentor/generate-roadmap

# Company Agent
POST /api/agents/company/create-profile
POST /api/agents/company/analyze-fit

# Task Agent
POST /api/agents/task/generate-plan
POST /api/agents/task/schedule-interviews
```

### Group Discussion Endpoints (Phase 3)

```http
POST /api/discussions/initialize
POST /api/discussions/:id/message
POST /api/discussions/:id/ask-agent
GET  /api/discussions/:id/consensus
GET  /api/discussions/:id/summary
POST /api/discussions/:id/end
GET  /api/discussions/agents/available
```

**Complete API Documentation**: See [API_REFERENCE.md](recovered_code/PHASE_3_API_REFERENCE.md)

---

## Development

### Available Scripts

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Backend
cd backend
npm run dev          # Start with nodemon
npm start            # Production start
npm test             # Run Jest tests
```

### Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Consistent code style
- **Type Safety**: Full TypeScript coverage
- **Testing**: Jest for backend, React Testing Library for frontend

### Environment Variables

Frontend (.env):

```env
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000
```

Backend (backend/.env):

```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
PORT=5000
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

---

## Deployment

### Frontend Deployment (Vercel/Netlify)

1. **Build the application**

```bash
npm run build
```

2. **Deploy to Vercel**

```bash
npm i -g vercel
vercel --prod
```

**Environment Variables Required**:

- `VITE_API_URL`
- `VITE_BACKEND_URL`

### Backend Deployment (Railway/Render/Heroku)

1. **Set environment variables on platform**

2. **Deploy commands**

```json
{
  "build": "npm install",
  "start": "node server.js"
}
```

**Environment Variables Required**:

- `MONGODB_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `PORT`
- `NODE_ENV=production`

### Database Setup (MongoDB Atlas)

1. Create cluster on MongoDB Atlas
2. Add database user
3. Whitelist IP addresses
4. Get connection string
5. Replace in `MONGODB_URI`

---

## Performance Metrics

| Metric            | Target  | Status |
| ----------------- | ------- | ------ |
| Page Load Time    | < 2s    | ✅     |
| API Response      | < 500ms | ✅     |
| AI Response       | < 3s    | ✅     |
| WebSocket Latency | < 100ms | ✅     |
| Lighthouse Score  | 90+     | ✅     |

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style

- Follow existing code patterns
- Use TypeScript for type safety
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for AI capabilities
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for code editing
- [Socket.io](https://socket.io/) for real-time features

---

## Support

- Issues: [GitHub Issues](../../issues)
- Discussions: [GitHub Discussions](../../discussions)

---

## Roadmap

- [ ] Video interview simulations
- [ ] More AI models integration (GPT-4, Claude)
- [ ] Mobile app (React Native)
- [ ] Interview scheduling system
- [ ] Peer-to-peer mock interviews
- [ ] Company-specific interview prep
- [ ] Interview question marketplace

---

<div align="center">

**Built by the InterviewAI Team**

[⬆ back to top](#-interviewai---ai-powered-interview-preparation-platform)

</div>
