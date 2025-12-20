import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, ArrowRight, Loader2, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speechRecognitionRef = useRef<any>(null);
  const { toast } = useToast();

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

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswer((prev) => prev + (prev ? " " : "") + transcript);
      console.log("Speech recognized:", transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      toast({
        title: "Speech Recognition Error",
        description: "Could not recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      // Cancel any ongoing speech synthesis
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, [toast]);

  // Text-to-Speech Helper
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser");
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      console.log("Speech started");
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log("Speech ended");
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  };

  // Speak question when it changes
  useEffect(() => {
    if (interviewStarted && !interviewComplete && questions.length > 0) {
      // Small delay to ensure UI is updated
      const timer = setTimeout(() => {
        speakText(questions[currentQuestion]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, interviewStarted, interviewComplete, questions]);

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
    if (!speechRecognitionRef.current) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak your answer clearly.",
        });
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast({
          title: "Error",
          description: "Failed to start voice input.",
          variant: "destructive",
        });
      }
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
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

          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold text-gray-900 flex-1">
                {questions[currentQuestion]}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isSpeaking
                    ? stopSpeaking()
                    : speakText(questions[currentQuestion])
                }
                disabled={loading}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {isSpeaking ? "Stop" : "Read Question"}
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Your Answer:
              </label>
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
                disabled={loading}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    {isRecording ? "Stop Recording" : "Listening..."}
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
