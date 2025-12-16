import api from './api';

/**
 * Gemini API Service
 * All Gemini API calls go through the backend proxy for security
 */

interface GeminiGenerateRequest {
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
  rawText?: string;
  finishReason?: string;
}

/**
 * Generate content using Gemini API
 */
export const generateContent = async (
  request: GeminiGenerateRequest
): Promise<GeminiResponse> => {
  try {
    const response = await api.post('/gemini/generate', request);
    return response.data;
  } catch (error: any) {
    console.error('Gemini generate error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to generate content',
      details: error.message
    };
  }
};

/**
 * Generate JSON content using Gemini API with automatic cleaning
 */
export const generateJSON = async (
  request: GeminiGenerateRequest
): Promise<GeminiResponse> => {
  try {
    const response = await api.post('/gemini/generate-json', request);
    return response.data;
  } catch (error: any) {
    console.error('Gemini generate JSON error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to generate JSON content',
      details: error.message
    };
  }
};

/**
 * Generate speech from text using Gemini TTS
 */
export const generateSpeech = async (
  text: string,
  model: string = 'gemini-2.0-flash-tts'
): Promise<GeminiResponse> => {
  try {
    const response = await api.post('/gemini/tts', { text, model });
    return response.data;
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to generate speech',
      details: error.message
    };
  }
};

export default {
  generateContent,
  generateJSON,
  generateSpeech
};
