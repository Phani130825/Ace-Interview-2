# Interview Simulator Setup Guide

## Features

This project includes an AI-powered Interview Simulator with the following capabilities:

- **Real-time Speech-to-Text (STT)**: Converts spoken responses to text using Web Speech API
- **Text-to-Speech (TTS)**: Speaks interview questions using browser TTS
- **Local LLM Integration**: Runs language models locally via WebWorkers (with WASM support planned)
- **Remote LLM Support**: Fallback to remote LLM APIs
- **Interactive Transcript**: Real-time display of conversation with timestamps
- **Session Management**: Save interview sessions with scoring and feedback
- **Audio Controls**: Microphone and TTS toggles, voice selection, playback speed

## Setup Instructions

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- MongoDB Atlas account for database
- (Optional) Local LLM model files for offline operation

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000

# Backend
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-jwt-secret
PORT=5000

# Optional: Remote LLM
REMOTE_LLM_URL=https://api.openai.com/v1/chat/completions
REMOTE_LLM_API_KEY=your-api-key
```

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start MongoDB (if running locally)
mongod

# Start the backend server
npm run server

# In another terminal, start the frontend
npm run dev
```

### Database Setup

1. Create a MongoDB Atlas cluster or use local MongoDB
2. Update `MONGODB_URI` in your `.env` file
3. The application will automatically create required collections

### Browser Requirements

For full functionality, ensure your browser supports:

- Web Speech API (Chrome/Edge recommended)
- Web Workers
- Speech Synthesis API

## Interview Simulator Usage

1. **Create an Interview**: Use the interview creation endpoint or UI
2. **Start Session**: Click "Start Interview" to begin
3. **Speak Responses**: Enable microphone and speak clearly
4. **View Transcript**: Real-time transcript appears in the chat
5. **End Session**: Click "End Interview" to get feedback and save

### API Endpoints

#### Interview Management

- `POST /api/interviews/create` - Create new interview
- `GET /api/interviews` - List user's interviews
- `POST /api/interviews/:id/submit` - Submit session data

#### Audio/Text Processing

- `POST /api/interviews/:id/tts` - Generate TTS audio

## Development

### Project Structure

```
recovered_code/
├── src/
│   ├── components/
│   │   ├── InterviewSimulator.tsx    # Main simulator component
│   │   └── ...
│   ├── workers/
│   │   └── llmWorker.ts              # Local LLM worker
│   ├── types/
│   │   └── speech.d.ts               # Web Speech API types
│   └── __tests__/
│       └── InterviewSimulator.test.tsx
├── backend/
│   ├── models/
│   │   ├── InterviewSession.js       # Session data model
│   │   └── ...
│   ├── routes/
│   │   └── interviews.js             # Interview API routes
│   └── services/
│       └── aiService.js              # AI processing service
└── ...
```

### Running Tests

```sh
npm test
```

### Building for Production

```sh
npm run build
```

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Node.js, Express, MongoDB, Socket.IO
- **AI/ML**: Web Speech API, Speech Synthesis, WebWorkers, WASM (planned)
- **Testing**: Jest, React Testing Library

## Deployment

This application can be deployed to any static hosting service or cloud platform that supports Node.js applications. Build the frontend with `npm run build` and deploy the `dist` folder to your hosting provider.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
