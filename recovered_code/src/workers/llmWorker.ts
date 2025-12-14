// llmWorker.ts - WebWorker for local LLM integration

interface WorkerMessage {
  type: 'generate' | 'init' | 'generate-question';
  data?: any;
}

interface WorkerResponse {
  type: 'token' | 'done' | 'error';
  token?: string;
  error?: string;
}

// TODO: Integrate with actual wasm-backed LLM model (e.g., llama.cpp wasm)
// For now, this is a stub implementation with mock responses

let isInitialized = false;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  // Validate message structure
  if (!type) {
    self.postMessage({
      type: 'error',
      error: 'Message type is required'
    } as WorkerResponse);
    return;
  }

  switch (type) {
    case 'init':
      try {
        // Validate initialization data if needed
        if (data && typeof data !== 'object') {
          throw new Error('Invalid initialization data');
        }

        // TODO: Initialize wasm model here
        // await initLLMModel(data.modelPath);
        isInitialized = true;
        self.postMessage({ type: 'done' } as WorkerResponse);
      } catch (error) {
        console.error('LLM initialization error:', error);
        self.postMessage({
          type: 'error',
          error: `Failed to initialize LLM: ${error instanceof Error ? error.message : String(error)}`
        } as WorkerResponse);
      }
      break;

    case 'generate':
      if (!isInitialized) {
        self.postMessage({
          type: 'error',
          error: 'LLM not initialized. Please initialize first.'
        } as WorkerResponse);
        return;
      }

      // Validate required data
      if (!data || !data.prompt) {
        self.postMessage({
          type: 'error',
          error: 'Prompt is required for generation'
        } as WorkerResponse);
        return;
      }

      try {
         // Store context for use in mock response
         (self as any).lastContext = data.context;
        // TODO: Replace with actual LLM generation
        // const response = await generateResponse(data.prompt, data.context);
        const mockResponse = generateMockResponse(data.prompt, data.context);

        // Validate response
        if (!mockResponse || typeof mockResponse !== 'string') {
          throw new Error('Invalid response generated');
        }

        // Simulate streaming tokens
        for (const token of mockResponse.split(' ')) {
          self.postMessage({ type: 'token', token: token + ' ' } as WorkerResponse);
          // Simulate delay between tokens
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        self.postMessage({ type: 'done' } as WorkerResponse);
      } catch (error) {
        console.error('LLM generation error:', error);
        self.postMessage({
          type: 'error',
          error: `Generation failed: ${error instanceof Error ? error.message : String(error)}`
        } as WorkerResponse);
      }
      break;

    case 'generate-question':
      if (!isInitialized) {
        self.postMessage({
          type: 'error',
          error: 'LLM not initialized. Please initialize first.'
        } as WorkerResponse);
        return;
      }

      // Validate required data
      if (!data || !data.interviewType || !data.userResponse) {
        self.postMessage({
          type: 'error',
          error: 'Interview type and user response are required for question generation'
        } as WorkerResponse);
        return;
      }

      try {
        // Generate next interview question based on user response and conversation history
        const nextQuestion = generateNextQuestion(data.interviewType, data.userResponse, data.conversationHistory);

        // Validate generated question
        if (!nextQuestion || typeof nextQuestion !== 'string') {
          throw new Error('Invalid question generated');
        }

        // Simulate streaming the question
        for (const token of nextQuestion.split(' ')) {
          self.postMessage({ type: 'token', token: token + ' ' } as WorkerResponse);
          // Simulate delay between tokens
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        self.postMessage({ type: 'done' } as WorkerResponse);
      } catch (error) {
        console.error('Question generation error:', error);
        self.postMessage({
          type: 'error',
          error: `Question generation failed: ${error instanceof Error ? error.message : String(error)}`
        } as WorkerResponse);
      }
      break;

    default:
      self.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}. Supported types: init, generate, generate-question`
      } as WorkerResponse);
  }
};

// Mock response generator for development
function generateMockResponse(prompt: string, context?: any[]): string {
  // Use context to generate a more realistic mock response
  let contextText = '';
  if (Array.isArray(context)) {
    contextText = context.map((entry: any) => entry.text).join(' ');
  }
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('introduce yourself')) {
    return "Thank you for your introduction. Based on your background, let's move on to a technical question.";
  }
  if (lowerPrompt.includes('experience')) {
    return "That's impressive experience. Can you share a project from your transcript where you applied these skills?";
  }
  if (lowerPrompt.includes('challenge')) {
    return "Interesting challenge. From your previous answers, how did you approach solving this problem?";
  }
  if (lowerPrompt.includes('strengths')) {
    return "Those are valuable strengths. Can you give an example from your transcript where you demonstrated leadership?";
  }
  if (lowerPrompt.includes('weaknesses')) {
    return "That's a thoughtful answer. How have you improved in that area, considering your previous responses?";
  }
  if (contextText.length > 0) {
    return `Thank you for your response. Based on our conversation so far: ${contextText.slice(-100)} ... Let's continue with the next question.`;
  }
  // Default response
  return "Thank you for your response. That's helpful to know. Let's continue with the next question.";
}

// Mock next question generator for development
function generateNextQuestion(interviewType: string, userResponse: string, conversationHistory: any[]): string {
  // Simple mock questions based on interview type and previous responses
  const hrQuestions = [
    "Can you tell me about a time when you had to work with a difficult team member?",
    "What are your career goals for the next 5 years?",
    "How do you handle stress and pressure at work?",
    "Describe your ideal work environment.",
    "Why are you interested in this company specifically?"
  ];

  const managerialQuestions = [
    "How would you handle a situation where a team member is underperforming?",
    "Describe your leadership style and how it has evolved.",
    "How do you prioritize tasks when managing multiple projects?",
    "Tell me about a time you had to make a difficult decision as a leader.",
    "How do you motivate and develop your team members?"
  ];

  const technicalQuestions = [
    "Can you walk me through a complex technical problem you solved recently?",
    "How do you stay current with technology trends in your field?",
    "Describe your experience with debugging and troubleshooting.",
    "How do you approach code reviews and ensuring code quality?",
    "Tell me about a technical challenge you faced and how you overcame it."
  ];

  let questions: string[];
  switch (interviewType.toLowerCase()) {
    case 'hr':
      questions = hrQuestions;
      break;
    case 'managerial':
      questions = managerialQuestions;
      break;
    case 'technical':
    default:
      questions = technicalQuestions;
      break;
  }

  // Simple logic to avoid repeating similar questions
  const historyText = conversationHistory.map(entry => entry.text || '').join(' ').toLowerCase();
  const availableQuestions = questions.filter(q =>
    !historyText.includes(q.toLowerCase().substring(0, 20))
  );

  if (availableQuestions.length === 0) {
    return "Can you elaborate more on that experience and what you learned from it?";
  }

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[randomIndex];
}

// TODO: Implement actual LLM functions
/*
async function initLLMModel(modelPath: string) {
  // Load and initialize the wasm model
  // This would involve loading the model file and setting up the inference engine
}

async function generateResponse(prompt: string, context?: any): Promise<string> {
  // Generate response using the loaded model
  // This would call the wasm inference function with the prompt
  return '';
}
*/
