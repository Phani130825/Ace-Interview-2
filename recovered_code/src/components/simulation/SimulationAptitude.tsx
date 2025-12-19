import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, AlertCircle } from "lucide-react";
import api from "@/services/api";
import { generateJSON } from "@/services/geminiService";

interface SimulationAptitudeProps {
  simulationId: string;
  onComplete: () => void;
  onBack: () => void;
}

const SimulationAptitude = ({
  simulationId,
  onComplete,
  onBack,
}: SimulationAptitudeProps) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [testComplete, setTestComplete] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (testStarted && !testComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [testStarted, testComplete]);

  const startTest = async () => {
    setLoading(true);
    try {
      // Generate 10 aptitude questions
      const prompt = `Generate 10 aptitude test questions covering logical reasoning, quantitative aptitude, and verbal ability. 
      Return ONLY a valid JSON array with this EXACT structure (no markdown, no code blocks):
      [
        {
          "question": "question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "option1",
          "explanation": "why this is correct",
          "category": "logical/quantitative/verbal"
        }
      ]`;

      const response = await generateJSON({
        prompt,
        model: "gemini-2.5-flash",
        maxOutputTokens: 8192,
        temperature: 0.7,
      });

      if (response.success && Array.isArray(response.data)) {
        setQuestions(response.data);
        setTestStarted(true);
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
    if (!selectedOption) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedOption;
    setAnswers(newAnswers);
    setSelectedOption("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitTest();
    }
  };

  const handleSubmitTest = async () => {
    if (testComplete) return; // Prevent double submission

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTestComplete(true);

    // Calculate score
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++;
      }
    });

    const percentage = (correct / questions.length) * 100;
    setScore(percentage);

    // Submit to backend
    try {
      await api.post(`/placement-simulation/${simulationId}/aptitude`, {
        questions,
        answers,
        score: percentage,
        correctAnswers: correct,
        totalQuestions: questions.length,
        timeTaken: 900 - timeLeft,
      });
    } catch (error) {
      console.error("Error submitting aptitude test:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Step 2: Aptitude Test
            </h2>
            <p className="text-gray-600 mb-6">
              You will face 10 questions covering logical reasoning,
              quantitative aptitude, and verbal ability. You have 15 minutes to
              complete the test.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Test Details:
              </h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Total Questions: 10</li>
                <li>Duration: 15 minutes</li>
                <li>Cannot go back to previous questions</li>
                <li>Test auto-submits when time expires</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                variant="hero"
                onClick={startTest}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Generating Questions..." : "Start Aptitude Test"}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (testComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Aptitude Test Complete!
            </h2>

            <div className="my-8">
              <div className="text-6xl font-bold text-purple-600 mb-2">
                {score.toFixed(1)}%
              </div>
              <p className="text-gray-600">
                You answered{" "}
                {
                  answers.filter(
                    (ans, idx) => ans === questions[idx]?.correctAnswer
                  ).length
                }{" "}
                out of {questions.length} correctly
              </p>
            </div>

            <Button variant="hero" onClick={onComplete} size="lg">
              Continue to Coding Round
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <div className="text-sm font-medium text-gray-600 px-3 py-1 bg-gray-100 rounded">
                {currentQ?.category}
              </div>
            </div>
            <div className="flex items-center gap-2 text-orange-600 font-semibold">
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <Progress
            value={((currentQuestion + 1) / questions.length) * 100}
            className="mb-6"
          />

          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQ?.question}
          </h3>

          <div className="space-y-3 mb-8">
            {currentQ?.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedOption(option)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedOption === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === option
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedOption === option && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="hero"
            onClick={handleAnswer}
            disabled={!selectedOption}
            className="w-full"
            size="lg"
          >
            {currentQuestion < questions.length - 1
              ? "Next Question"
              : "Submit Test"}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default SimulationAptitude;
