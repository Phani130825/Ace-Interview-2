import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

interface Judge0SubmissionResult {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status?: {
    id: number;
    description: string;
  };
  time?: string;
  memory?: number;
}

export const submitCode = async (
  request: Judge0SubmissionRequest
): Promise<Judge0SubmissionResult> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/api/judge0/submit`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Code execution failed');
    }
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

export const languageMap = {
  javascript: 63, // JavaScript (Node.js 14.17.0)
  python: 71, // Python (3.8.1)
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
};
