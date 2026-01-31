import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clock, ArrowRight, Play, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";
import { generateJSON } from "@/services/geminiService";

interface SimulationCodingProps {
  simulationId: string;
  onComplete: () => void;
  onBack: () => void;
}

const SimulationCoding = ({
  simulationId,
  onComplete,
  onBack,
}: SimulationCodingProps) => {
  const [question, setQuestion] = useState<any>(null);
  const [code, setCode] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [submitting, setSubmitting] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (testStarted) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [testStarted]);

  const startTest = async () => {
    setLoading(true);
    try {
      const prompt = `Generate a medium difficulty coding problem suitable for placement tests.
      Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks):
      {
        "title": "problem title",
        "description": "detailed problem description",
        "inputFormat": "input format description",
        "outputFormat": "output format description",
        "constraints": ["constraint1", "constraint2"],
        "examples": [
          {
            "input": "sample input",
            "output": "sample output",
            "explanation": "why this is the output"
          }
        ],
        "testCases": [
          {
            "input": "test input",
            "expectedOutput": "expected output"
          }
        ],
        "starterCode": {
          "python": "def solution():\\n    pass",
          "javascript": "function solution() {\\n    \\n}"
        },
        "difficulty": "medium",
        "topics": ["array", "string"]
      }`;

      const response = await generateJSON({
        prompt,
        model: "gemini-2.5-flash",
        maxOutputTokens: 8192,
        temperature: 0.7,
      });

      if (response.success && response.data) {
        setQuestion(response.data);
        setCode(
          response.data.starterCode?.python || "# Write your solution here",
        );
        setTestStarted(true);
      } else {
        console.error("Invalid response:", response);
        alert(
          `Failed to generate question: ${
            response.error || "Invalid response format"
          }`,
        );
      }
    } catch (error: any) {
      console.error("Error generating question:", error);
      alert(
        `Failed to generate question: ${
          error.response?.data?.error || error.message || "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setSubmitting(true);
    try {
      // Simulate running test cases
      const results = question.testCases.map((testCase: any) => {
        // Simple simulation - in real app, would execute code
        return {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          passed: Math.random() > 0.3, // Simulate passing
        };
      });

      setTestResults(results);
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!testResults.length) {
      await runTests();
    }

    const passedTests = testResults.filter((r) => r.passed).length;
    const totalTests = testResults.length;
    const percentage = (passedTests / totalTests) * 100;

    // 🔍 AGENT DEBUGGING: Call coding evaluator agent
    try {
      const agentResponse = await api.post(`/api/agents/coding/analyze`, {
        code,
        language: "python",
        problemStatement: question?.description || "Coding problem",
      });

      if (agentResponse.data.success) {
        console.group(
          "%c✅ CODING EVALUATOR AGENT RESPONSE",
          "color: #ff6600; font-weight: bold; font-size: 14px",
        );
        console.log(
          "%cCode Quality Analysis:",
          "color: #ff6600; font-weight: bold",
          agentResponse.data.data.codeQuality,
        );
        console.log(
          "%cLogic Analysis:",
          "color: #0066ff; font-weight: bold",
          agentResponse.data.data.logicAnalysis,
        );
        console.log(
          "%cComplexity Analysis:",
          "color: #00cc66; font-weight: bold",
          agentResponse.data.data.complexityAnalysis,
        );
        console.log(
          "%c⚠️  WEAK TOPICS DETECTED:",
          "color: #ff3333; font-weight: bold",
          agentResponse.data.data.topicsIdentified,
        );
        console.table({
          "Overall Code Score": agentResponse.data.data.overallScore,
          Readability: agentResponse.data.data.codeQuality.readability,
          Maintainability: agentResponse.data.data.codeQuality.maintainability,
          "Time Complexity":
            agentResponse.data.data.complexityAnalysis.timeComplexity,
          "Space Complexity":
            agentResponse.data.data.complexityAnalysis.spaceComplexity,
          Verdict: agentResponse.data.data.verdict,
        });
        console.groupEnd();
      }
    } catch (error) {
      console.warn("Coding evaluator agent not available:", error);
    }

    setScore(percentage);
    setTestComplete(true);

    // Submit to backend
    try {
      await api.post(`/placement-simulation/${simulationId}/coding`, {
        questionTitle: question?.title || "Coding Problem",
        code,
        language: "python",
        testsPassed: passedTests,
        totalTests,
        score: percentage,
        timeTaken: 1800 - timeLeft,
      });
    } catch (error) {
      console.error("Error submitting coding round:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Step 3: Coding Round
            </h2>
            <p className="text-gray-600 mb-6">
              Solve a medium-difficulty coding problem. You have 30 minutes to
              write and test your solution.
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-900 mb-2">
                Round Details:
              </h3>
              <ul className="list-disc list-inside text-purple-800 space-y-1">
                <li>Duration: 30 minutes</li>
                <li>1 coding problem</li>
                <li>Test your code before submission</li>
                <li>Auto-submits when time expires</li>
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
                {loading ? "Generating Problem..." : "Start Coding Round"}
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Coding Round Complete!
            </h2>

            <div className="my-8">
              <div className="text-6xl font-bold text-purple-600 mb-2">
                {score.toFixed(1)}%
              </div>
              <p className="text-gray-600">
                You passed {testResults.filter((r) => r.passed).length} out of{" "}
                {testResults.length} test cases
              </p>
            </div>

            <Button variant="hero" onClick={onComplete} size="lg">
              Continue to Technical Interview
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Statement */}
        <Card className="p-6 overflow-y-auto max-h-[calc(100vh-3rem)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {question?.title}
            </h2>
            <div className="flex items-center gap-2 text-orange-600 font-semibold">
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Problem Description
            </h3>
            <p className="text-gray-700 mb-4">{question?.description}</p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Input Format
            </h3>
            <p className="text-gray-700 mb-4">{question?.inputFormat}</p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Output Format
            </h3>
            <p className="text-gray-700 mb-4">{question?.outputFormat}</p>

            {question?.constraints && question.constraints.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Constraints
                </h3>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  {question.constraints.map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}

            {question?.examples && question.examples.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Examples
                </h3>
                {question.examples.map((ex: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded mb-3">
                    <p className="font-mono text-sm">
                      <strong>Input:</strong> {ex.input}
                    </p>
                    <p className="font-mono text-sm">
                      <strong>Output:</strong> {ex.output}
                    </p>
                    {ex.explanation && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Explanation:</strong> {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        {/* Code Editor */}
        <Card className="p-6 flex flex-col max-h-[calc(100vh-3rem)]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Solution
          </h3>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 font-mono text-sm mb-4"
            placeholder="Write your solution here..."
          />

          {testResults.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="font-semibold text-gray-900">Test Results:</h4>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded ${
                    result.passed ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">Test Case {index + 1}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={runTests} disabled={submitting}>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
            <Button
              variant="hero"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              Submit Solution
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimulationCoding;
