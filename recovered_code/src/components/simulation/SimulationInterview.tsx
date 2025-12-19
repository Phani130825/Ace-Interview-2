import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, ArrowRight, Loader2 } from "lucide-react";
import api from "@/services/api";
import { generateJSON } from "@/services/geminiService";

interface SimulationInterviewProps {
  simulationId: string;
  interviewType: "technical" | "managerial" | "hr";
  resumeText: string;
  onComplete: () => void;
  onBack: () => void;
}

const SimulationInterview = ({
  simulationId,
  interviewType,
  resumeText,
  onComplete,
  onBack,
}: SimulationInterviewProps) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState("");
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const interviewConfig = {
    technical: {
      title: "Technical Interview",
      description: "Technical questions based on your skills and experience",
      questionCount: 5,
      color: "blue",
    },
    managerial: {
      title: "Managerial Round",
      description: "Behavioral and management questions",
      questionCount: 5,
      color: "green",
    },
    hr: {
      title: "HR Interview",
      description: "Cultural fit and general HR questions",
      questionCount: 5,
      color: "orange",
    },
  };

  const config = interviewConfig[interviewType];

  const startInterview = async () => {
    setLoading(true);
    try {
      let prompt = "";

      if (interviewType === "technical") {
        prompt = `Based on this resume: ${resumeText}

Generate ${config.questionCount} technical interview questions that assess the candidate's technical skills, problem-solving ability, and experience. Focus on technologies and projects mentioned in the resume.

Return ONLY a valid JSON array with this EXACT structure (no markdown, no code blocks):
["question1", "question2", "question3", "question4", "question5"]`;
      } else if (interviewType === "managerial") {
        prompt = `Based on this resume: ${resumeText}

Generate ${config.questionCount} managerial/behavioral interview questions that assess leadership, teamwork, problem-solving, and project management skills.

Return ONLY a valid JSON array with this EXACT structure (no markdown, no code blocks):
["question1", "question2", "question3", "question4", "question5"]`;
      } else {
        prompt = `Generate ${config.questionCount} HR interview questions covering:
- Career goals and motivation
- Cultural fit
- Strengths and weaknesses
- Salary expectations and availability

Return ONLY a valid JSON array with this EXACT structure (no markdown, no code blocks):
["question1", "question2", "question3", "question4", "question5"]`;
      }

      const response = await generateJSON({
        prompt,
        model: "gemini-2.5-flash",
        maxOutputTokens: 4096,
        temperature: 0.7,
      });

      if (response.success && Array.isArray(response.data)) {
        setQuestions(response.data);
        setInterviewStarted(true);
      } else {
        console.error("Invalid response:", response);
        alert(
          `Failed to generate questions: ${
            response.error || "Invalid response format"
          }`
        );
      }
    } catch (error: any) {
      console.error("Error generating questions:", error);
      alert(
        `Failed to generate questions: ${
          error.response?.data?.error || error.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!answer.trim()) return;

    const newResponses = [
      ...responses,
      { question: questions[currentQuestion], answer },
    ];
    setResponses(newResponses);
    setAnswer("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      evaluateInterview(newResponses);
    }
  };

  const evaluateInterview = async (allResponses: any[]) => {
    setLoading(true);
    try {
      const prompt = `Rate this ${interviewType} interview on a scale of 0-100.

Responses:
${allResponses
  .map((r, i) => `Q${i + 1}: ${r.question}\nA: ${r.answer}`)
  .join("\n")}

Return ONLY valid JSON with this exact format (no markdown, no extra text):
{"score": 85, "feedback": "Brief evaluation"}

Keep feedback under 80 characters. Use simple words only.`;

      const response = await generateJSON({
        prompt,
        model: "gemini-2.5-flash",
        maxOutputTokens: 200,
        temperature: 0.2,
      });

      let finalScore = 70;
      let finalFeedback = "Interview completed successfully.";

      if (response.success && response.data) {
        finalScore = response.data.score || 70;
        finalFeedback = response.data.feedback || "Good performance overall.";
      } else {
        console.warn("AI evaluation failed, using default values", response);
      }

      setScore(finalScore);
      setFeedback(finalFeedback);
      setInterviewComplete(true);

      // Submit to backend
      const endpoint =
        interviewType === "technical"
          ? "technical-interview"
          : interviewType === "managerial"
          ? "managerial-interview"
          : "hr-interview";

      await api.post(`/placement-simulation/${simulationId}/${endpoint}`, {
        questions,
        responses: allResponses,
        score: finalScore,
        feedback: finalFeedback,
      });
    } catch (error: any) {
      console.error("Error evaluating interview:", error);

      // Set default values
      const defaultScore = 70;
      const defaultFeedback = "Interview completed successfully.";

      setScore(defaultScore);
      setFeedback(defaultFeedback);
      setInterviewComplete(true);

      // Still submit to backend with default values
      try {
        const endpoint =
          interviewType === "technical"
            ? "technical-interview"
            : interviewType === "managerial"
            ? "managerial-interview"
            : "hr-interview";

        await api.post(`/placement-simulation/${simulationId}/${endpoint}`, {
          questions,
          responses: allResponses,
          score: defaultScore,
          feedback: defaultFeedback,
        });
      } catch (submitError) {
        console.error("Error submitting interview:", submitError);
        alert("Interview completed but failed to save. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, integrate with speech recognition API
  };

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {config.title}
            </h2>
            <p className="text-gray-600 mb-6">{config.description}</p>

            <div
              className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4 mb-6`}
            >
              <h3 className={`font-semibold text-${config.color}-900 mb-2`}>
                Interview Details:
              </h3>
              <ul
                className={`list-disc list-inside text-${config.color}-800 space-y-1`}
              >
                <li>Total Questions: {config.questionCount}</li>
                <li>Questions based on your resume</li>
                <li>Type or speak your answers</li>
                <li>Take your time to think before answering</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                variant="hero"
                onClick={startInterview}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Preparing Interview..." : `Start ${config.title}`}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (interviewComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {config.title} Complete!
            </h2>

            <div className="my-8">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {score}/100
              </div>
              <p className="text-gray-600 mb-4">Your Interview Score</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Feedback:</h3>
                <p className="text-blue-800">{feedback}</p>
              </div>
            </div>

            <Button variant="hero" onClick={onComplete} size="lg">
              {interviewType === "technical"
                ? "Continue to Managerial Round"
                : interviewType === "managerial"
                ? "Continue to HR Interview"
                : "View Final Results"}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {questions[currentQuestion]}
          </h3>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Your Answer:
              </label>
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Input
                  </>
                )}
              </Button>
            </div>

            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={8}
              className="w-full"
            />
          </div>

          <Button
            variant="hero"
            onClick={handleAnswer}
            disabled={!answer.trim() || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : currentQuestion < questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                Complete Interview
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default SimulationInterview;
