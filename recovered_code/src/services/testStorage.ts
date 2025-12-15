/**
 * Test Storage Service
 * Manages storage and retrieval of test results and interview sessions
 * Saves to MongoDB (with localStorage fallback for offline support)
 */

import api from './api';

export interface AptitudeTestResult {
  id: string;
  timestamp: number;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken?: number;
}

export interface CodingTestResult {
  id: string;
  timestamp: number;
  questionTitle: string;
  questionDescription: string;
  language: string;
  totalTestCases: number;
  passedTestCases: number;
  score: number;
  percentage: number;
  timeTaken?: number;
  submissionStatus: 'completed' | 'partial' | 'not_attempted';
}

export interface InterviewSession {
  id: string;
  timestamp: number;
  interviewType: 'technical' | 'hr' | 'managerial' | 'ai';
  interviewerName: string;
  jobRole: string;
  company: string;
  chatLog: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
  duration?: number;
  feedback?: string;
  status: 'completed' | 'in-progress' | 'early-exit';
}

const STORAGE_KEYS = {
  APTITUDE_TESTS: 'ace_interview_aptitude_tests',
  CODING_TESTS: 'ace_interview_coding_tests',
  INTERVIEW_SESSIONS: 'ace_interview_sessions',
};

// Helper function to get userId
const getUserId = (): string => {
  return localStorage.getItem('userId') || '';
};

// Helper function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Aptitude Test Storage
export const saveAptitudeTest = async (result: Omit<AptitudeTestResult, 'id' | 'timestamp'>): Promise<string> => {
  const userId = getUserId();
  const newTest: AptitudeTestResult = {
    ...result,
    id: generateId(),
    timestamp: Date.now(),
  };

  // Save to localStorage first (for offline support)
  try {
    const tests = getAptitudeTestsFromLocalStorage();
    tests.push(newTest);
    localStorage.setItem(STORAGE_KEYS.APTITUDE_TESTS, JSON.stringify(tests));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }

  // Save to MongoDB
  try {
    const response = await api.post('/aptitude-tests', {
      userId,
      questions: result.questions,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      timeTaken: result.timeTaken,
    });
    
    if (response.data.success) {
      return response.data.data._id;
    }
  } catch (error) {
    console.warn('Failed to save to MongoDB, using localStorage only:', error);
  }

  return newTest.id;
};

const getAptitudeTestsFromLocalStorage = (): AptitudeTestResult[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APTITUDE_TESTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting aptitude tests from localStorage:', error);
    return [];
  }
};

export const getAptitudeTests = async (): Promise<AptitudeTestResult[]> => {
  const userId = getUserId();
  
  // If no userId, return localStorage data only
  if (!userId) {
    return getAptitudeTestsFromLocalStorage();
  }
  
  // Try to fetch from MongoDB first
  try {
    const response = await api.get(`/aptitude-tests/user/${userId}`);
    if (response.data.success && response.data.data) {
      const tests = response.data.data.map((test: any) => ({
        id: test._id,
        timestamp: new Date(test.timestamp).getTime(),
        questions: test.questions,
        score: test.score,
        totalQuestions: test.totalQuestions,
        percentage: test.percentage,
        timeTaken: test.timeTaken,
      }));
      return tests;
    }
  } catch (error: any) {
    // Silently fall back to localStorage for auth errors
    if (error?.response?.status === 401 || error?.response?.status === 429) {
      // Don't log auth errors or rate limit errors
    } else {
      console.warn('Failed to fetch from MongoDB, using localStorage:', error);
    }
  }

  // Fallback to localStorage
  return getAptitudeTestsFromLocalStorage();
};

export const getAptitudeTestById = async (id: string): Promise<AptitudeTestResult | null> => {
  const tests = await getAptitudeTests();
  return tests.find(test => test.id === id) || null;
};

export const getLatestAptitudeTest = async (): Promise<AptitudeTestResult | null> => {
  const tests = await getAptitudeTests();
  if (tests.length === 0) return null;
  return tests.sort((a, b) => b.timestamp - a.timestamp)[0];
};

// Coding Test Storage
export const saveCodingTest = (result: Omit<CodingTestResult, 'id' | 'timestamp'>): string => {
  try {
    const tests = getCodingTests();
    const newTest: CodingTestResult = {
      ...result,
      id: generateId(),
      timestamp: Date.now(),
    };
    tests.push(newTest);
    localStorage.setItem(STORAGE_KEYS.CODING_TESTS, JSON.stringify(tests));
    return newTest.id;
  } catch (error) {
    console.error('Error saving coding test:', error);
    return '';
  }
};

export const getCodingTests = (): CodingTestResult[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CODING_TESTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting coding tests:', error);
    return [];
  }
};

export const getCodingTestById = (id: string): CodingTestResult | null => {
  const tests = getCodingTests();
  return tests.find(test => test.id === id) || null;
};

export const getLatestCodingTest = (): CodingTestResult | null => {
  const tests = getCodingTests();
  if (tests.length === 0) return null;
  return tests.sort((a, b) => b.timestamp - a.timestamp)[0];
};

// Interview Session Storage
export const saveInterviewSession = async (session: Omit<InterviewSession, 'id' | 'timestamp'>): Promise<string> => {
  const userId = getUserId();
  const newSession: InterviewSession = {
    ...session,
    id: generateId(),
    timestamp: Date.now(),
  };

  // Save to localStorage first (for offline support)
  try {
    const sessions = getInterviewSessionsFromLocalStorage();
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEYS.INTERVIEW_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }

  // Save to MongoDB
  try {
    const response = await api.post('/interview-sessions', {
      userId,
      interviewType: session.interviewType,
      interviewerName: session.interviewerName,
      jobRole: session.jobRole,
      company: session.company,
      chatLog: session.chatLog,
      duration: session.duration,
      feedback: session.feedback,
      status: session.status,
    });
    
    if (response.data.success) {
      return response.data.data._id;
    }
  } catch (error) {
    console.warn('Failed to save interview session to MongoDB:', error);
  }

  return newSession.id;
};

export const updateInterviewSession = async (id: string, updates: Partial<InterviewSession>): Promise<boolean> => {
  // Update localStorage first
  try {
    const sessions = getInterviewSessionsFromLocalStorage();
    const index = sessions.findIndex(session => session.id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.INTERVIEW_SESSIONS, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error updating localStorage:', error);
  }

  // Update MongoDB
  try {
    const response = await api.put(`/interview-sessions/${id}`, updates);
    return response.data.success;
  } catch (error) {
    console.warn('Failed to update interview session in MongoDB:', error);
    return false;
  }
};

const getInterviewSessionsFromLocalStorage = (): InterviewSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INTERVIEW_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting interview sessions from localStorage:', error);
    return [];
  }
};

export const getInterviewSessions = async (): Promise<InterviewSession[]> => {
  const userId = getUserId();
  
  // If no userId, return localStorage data only
  if (!userId) {
    return getInterviewSessionsFromLocalStorage();
  }
  
  // Try to fetch from MongoDB first
  try {
    const response = await api.get(`/interview-sessions/user/${userId}`);
    if (response.data.success && response.data.data) {
      const sessions = response.data.data.map((session: any) => ({
        id: session._id,
        timestamp: new Date(session.timestamp).getTime(),
        interviewType: session.interviewType,
        interviewerName: session.interviewerName,
        jobRole: session.jobRole,
        company: session.company,
        chatLog: session.chatLog,
        duration: session.duration,
        feedback: session.feedback,
        status: session.status,
      }));
      return sessions;
    }
  } catch (error: any) {
    // Silently fall back to localStorage for auth errors
    if (error?.response?.status === 401 || error?.response?.status === 429) {
      // Don't log auth errors or rate limit errors
    } else {
      console.warn('Failed to fetch interview sessions from MongoDB:', error);
    }
  }

  // Fallback to localStorage
  return getInterviewSessionsFromLocalStorage();
};

export const getInterviewSessionById = async (id: string): Promise<InterviewSession | null> => {
  const sessions = await getInterviewSessions();
  return sessions.find(session => session.id === id) || null;
};

export const getLatestInterviewSession = async (): Promise<InterviewSession | null> => {
  const sessions = await getInterviewSessions();
  if (sessions.length === 0) return null;
  return sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
};

export const getInterviewSessionsByType = async (type: InterviewSession['interviewType']): Promise<InterviewSession[]> => {
  const sessions = await getInterviewSessions();
  return sessions.filter(session => session.interviewType === type);
};

// Analytics & Reporting
export const getPerformanceStats = async () => {
  const aptitudeTests = await getAptitudeTests();
  const codingTests = getCodingTests();
  const interviewSessions = await getInterviewSessions();

  return {
    aptitude: {
      total: aptitudeTests.length,
      averageScore: aptitudeTests.length > 0
        ? aptitudeTests.reduce((sum, test) => sum + test.percentage, 0) / aptitudeTests.length
        : 0,
      lastAttempt: await getLatestAptitudeTest(),
    },
    coding: {
      total: codingTests.length,
      averageScore: codingTests.length > 0
        ? codingTests.reduce((sum, test) => sum + test.percentage, 0) / codingTests.length
        : 0,
      lastAttempt: getLatestCodingTest(),
    },
    interviews: {
      total: interviewSessions.length,
      byType: {
        technical: (await getInterviewSessionsByType('technical')).length,
        hr: (await getInterviewSessionsByType('hr')).length,
        managerial: (await getInterviewSessionsByType('managerial')).length,
        ai: (await getInterviewSessionsByType('ai')).length,
      },
      lastSession: await getLatestInterviewSession(),
    },
  };
};

// Clear functions (for testing or reset)
export const clearAptitudeTests = () => {
  localStorage.removeItem(STORAGE_KEYS.APTITUDE_TESTS);
};

export const clearCodingTests = () => {
  localStorage.removeItem(STORAGE_KEYS.CODING_TESTS);
};

export const clearInterviewSessions = () => {
  localStorage.removeItem(STORAGE_KEYS.INTERVIEW_SESSIONS);
};

export const clearAllTestData = () => {
  clearAptitudeTests();
  clearCodingTests();
  clearInterviewSessions();
};
