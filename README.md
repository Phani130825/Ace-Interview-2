# InterviewAI - AI-Powered Interview Preparation Platform

This is a comprehensive AI-powered interview preparation platform built with modern web technologies.

## Features

- AI-driven interview simulations
- Real-time speech-to-text and text-to-speech capabilities
- Personalized feedback and scoring
- Resume optimization tools
- Multiple interview types (Technical, HR, Managerial, Aptitude)
- Coding round practice with Monaco Editor
- Performance analytics and tracking

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Node.js, Express, MongoDB
- **AI/ML**: Web Speech API, Speech Synthesis, WebWorkers
- **Code Editor**: Monaco Editor (VS Code-like experience)
- **Charts**: Recharts for analytics

## Getting Started

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- MongoDB Atlas account or local MongoDB instance

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start MongoDB (if using local instance)
mongod

# Start the backend server
npm run server

# In another terminal, start the frontend
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Frontend
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000

# Backend
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-jwt-secret
PORT=5000
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
recovered_code/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   └── workers/       # Web workers for AI processing
├── backend/
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   └── services/      # Business logic services
└── ...
```

## Deployment

This application can be deployed to any static hosting service or cloud platform that supports Node.js applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
