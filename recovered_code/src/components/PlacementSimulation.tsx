import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Target,
  Code,
  Video,
  Briefcase,
  Users,
  CheckCircle,
  ArrowRight,
  Trophy,
  Clock,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import SimulationAptitude from "./simulation/SimulationAptitude";
import SimulationCoding from "./simulation/SimulationCoding";
import SimulationInterview from "./simulation/SimulationInterview";

interface PlacementSimulationProps {
  onNavigate: (view: string) => void;
}

const steps = [
  { id: 0, name: "Resume", icon: FileText, color: "text-blue-500" },
  { id: 1, name: "Aptitude Test", icon: Target, color: "text-purple-500" },
  { id: 2, name: "Coding Round", icon: Code, color: "text-orange-500" },
  { id: 3, name: "Technical", icon: Video, color: "text-green-500" },
  { id: 4, name: "Managerial", icon: Briefcase, color: "text-indigo-500" },
  { id: 5, name: "HR Interview", icon: Users, color: "text-pink-500" },
];

const PlacementSimulation = ({ onNavigate }: PlacementSimulationProps) => {
  const { user } = useAuth();
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>("overview");

  // Step-specific states
  const [resumeText, setResumeText] = useState("");
  const [stepLoading, setStepLoading] = useState(false);

  useEffect(() => {
    loadActiveSimulation();
  }, []);

  const loadActiveSimulation = async () => {
    try {
      const response = await api.get("/placement-simulation/active");
      if (response.data.success) {
        setSimulation(response.data.data);

        // Determine current view based on simulation state
        if (
          response.data.data.currentStep === 6 &&
          response.data.data.status === "completed"
        ) {
          setCurrentView("analytics");
        } else {
          setCurrentView("overview");
        }
      }
    } catch (error) {
      console.error("Error loading simulation:", error);
    } finally {
      setLoading(false);
    }
  };

  const startNewSimulation = async () => {
    try {
      setStepLoading(true);
      const response = await api.post("/placement-simulation/start");
      if (response.data.success) {
        setSimulation(response.data.data);
        setCurrentView("overview");
      }
    } catch (error) {
      console.error("Error starting simulation:", error);
    } finally {
      setStepLoading(false);
    }
  };

  const submitResume = async () => {
    if (!resumeText.trim()) {
      alert("Please enter your resume text");
      return;
    }

    try {
      setStepLoading(true);
      const response = await api.post(
        `/placement-simulation/${simulation._id}/resume`,
        {
          resumeText: resumeText.trim(),
        }
      );

      if (response.data.success) {
        setSimulation(response.data.data);
        setCurrentView("overview");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to submit resume");
    } finally {
      setStepLoading(false);
    }
  };

  const startStep = (stepId: number) => {
    if (!simulation) return;

    // Check if previous steps are completed
    if (stepId > 0 && !isStepCompleted(stepId - 1)) {
      alert("Please complete previous steps first");
      return;
    }

    switch (stepId) {
      case 0:
        setCurrentView("resume");
        break;
      case 1:
        setCurrentView("aptitude");
        break;
      case 2:
        setCurrentView("coding");
        break;
      case 3:
        setCurrentView("technical");
        break;
      case 4:
        setCurrentView("managerial");
        break;
      case 5:
        setCurrentView("hr");
        break;
    }
  };

  const isStepCompleted = (stepId: number): boolean => {
    if (!simulation) return false;

    switch (stepId) {
      case 0:
        return simulation.resume?.completed || false;
      case 1:
        return simulation.aptitude?.completed || false;
      case 2:
        return simulation.coding?.completed || false;
      case 3:
        return simulation.technicalInterview?.completed || false;
      case 4:
        return simulation.managerialInterview?.completed || false;
      case 5:
        return simulation.hrInterview?.completed || false;
      default:
        return false;
    }
  };

  const getProgress = () => {
    if (!simulation) return 0;
    let completed = 0;
    steps.forEach((step) => {
      if (isStepCompleted(step.id)) completed++;
    });
    return (completed / steps.length) * 100;
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading placement simulation...</p>
        </div>
      </div>
    );
  }

  // Overview View
  if (currentView === "overview") {
    // No active simulation - show start screen
    if (!simulation) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 flex items-center justify-center">
          <Card className="max-w-2xl w-full p-8 text-center">
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Complete Placement Simulation
            </h1>
            <p className="text-gray-600 mb-8">
              Experience the full placement journey: Resume shortlisting,
              aptitude test, coding round, and three interview rounds. Get
              comprehensive feedback and analytics at each step.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">
                What's Included:
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resume Shortlisting Round
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Aptitude Test (10 questions)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Coding Challenge
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Technical Interview
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Managerial Round
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  HR Interview
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Comprehensive Analytics
                </li>
              </ul>
            </div>
            <Button
              onClick={startNewSimulation}
              variant="hero"
              size="lg"
              disabled={stepLoading}
              className="w-full"
            >
              {stepLoading ? "Starting..." : "Begin Placement Simulation"}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Complete Placement Simulation
                </h1>
                <p className="text-gray-600">
                  Go through the entire placement process from resume to HR
                  interview
                </p>
              </div>
              {simulation?.status === "completed" && (
                <Button
                  onClick={startNewSimulation}
                  variant="professional"
                  disabled={stepLoading}
                >
                  Start New Simulation
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Overall Progress
                </h3>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(getProgress())}%
                </span>
              </div>
              <Progress value={getProgress()} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                {steps.filter((s) => isStepCompleted(s.id)).length} of{" "}
                {steps.length} steps completed
              </p>
            </Card>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const completed = isStepCompleted(step.id);
              const canStart = index === 0 || isStepCompleted(index - 1);
              const isLocked = !canStart;

              return (
                <Card
                  key={step.id}
                  className={`p-6 transition-all ${
                    completed
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                      : canStart
                      ? "hover:shadow-lg cursor-pointer border-blue-200"
                      : "opacity-50 cursor-not-allowed bg-gray-50"
                  }`}
                  onClick={() => canStart && !completed && startStep(step.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        completed
                          ? "bg-green-500 text-white"
                          : isLocked
                          ? "bg-gray-300 text-gray-500"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      Step {index + 1}
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2">{step.name}</h3>

                  {completed ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span>Completed</span>
                      </div>
                      {simulation && (
                        <div className="text-sm text-gray-600">
                          Score:{" "}
                          {getStepScore(step.id, simulation)?.toFixed(1) || 0}%
                        </div>
                      )}
                    </div>
                  ) : isLocked ? (
                    <p className="text-sm text-gray-500">
                      Complete previous steps first
                    </p>
                  ) : (
                    <Button
                      variant="professional"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        startStep(step.id);
                      }}
                    >
                      Start Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Show Analytics Button when completed */}
          {simulation?.status === "completed" && (
            <Card className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Simulation Completed!
                  </h3>
                  <p className="text-gray-600">
                    View your comprehensive analytics and performance report
                  </p>
                </div>
                <Button
                  onClick={() => setCurrentView("analytics")}
                  variant="hero"
                  size="lg"
                >
                  View Analytics
                  <BarChart3 className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Resume View
  if (currentView === "resume") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Step 1: Submit Your Resume
            </h2>
            <p className="text-gray-600 mb-6">
              Paste your resume text below. This will be used throughout the
              interview process.
            </p>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your complete resume text here..."
              className="w-full p-4 border border-gray-300 rounded-lg h-96 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentView("overview")}
                disabled={stepLoading}
              >
                Back to Overview
              </Button>
              <Button
                variant="hero"
                onClick={submitResume}
                disabled={stepLoading || !resumeText.trim()}
                className="flex-1"
              >
                {stepLoading ? "Submitting..." : "Submit Resume & Continue"}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Analytics View
  if (currentView === "analytics") {
    const overallScore = simulation?.overallScore || 0;
    const isSelected = overallScore >= 70;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Placement Simulation Results
            </h1>
            <p className="text-gray-600">
              Complete performance analysis across all placement rounds
            </p>
          </div>

          {/* Selection Result Banner */}
          <Card
            className={`p-8 mb-6 ${
              isSelected
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                : "bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-2xl font-bold mb-2 ${
                    isSelected ? "text-green-700" : "text-orange-700"
                  }`}
                >
                  {isSelected ? "🎉 SELECTED" : "📝 NOT SELECTED"}
                </h2>
                <p className="text-gray-600">
                  {isSelected
                    ? "Congratulations! You have successfully cleared the placement simulation."
                    : "Keep practicing! Review the detailed feedback below to improve your performance."}
                </p>
              </div>
              {isSelected ? (
                <Trophy className="h-20 w-20 text-yellow-500" />
              ) : (
                <TrendingUp className="h-20 w-20 text-orange-500" />
              )}
            </div>
          </Card>

          {/* Overall Score Card */}
          <Card className="p-8 mb-6 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  Overall Performance Score
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-purple-600">
                    {overallScore.toFixed(1)}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-medium">
                        {getPerformanceRating(overallScore)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Total Time: {formatTime(simulation?.totalTimeTaken || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <Trophy className="h-24 w-24 text-yellow-500 opacity-50" />
            </div>
          </Card>

          {/* Individual Step Scores */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {steps.map((step) => {
              const Icon = step.icon;
              const score = getStepScore(step.id, simulation);
              const completed = isStepCompleted(step.id);

              return (
                <Card key={step.id} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg bg-${
                        step.color.split("-")[1]
                      }-100 flex items-center justify-center`}
                    >
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{step.name}</h3>
                  </div>

                  {completed ? (
                    <>
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        {score?.toFixed(1) || 0}%
                      </div>
                      <Progress value={score || 0} className="h-2" />
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Not completed</p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Detailed Round Breakdown */}
          <div className="space-y-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Detailed Round Analysis
            </h2>

            {/* Aptitude Test Details */}
            {simulation?.aptitude?.completed && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-6 w-6 text-purple-500" />
                  Aptitude Test - {simulation.aptitude.score}%
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {simulation.aptitude.correctAnswers} correct out of{" "}
                  {simulation.aptitude.totalQuestions} questions
                </p>
                {simulation.aptitude.questions?.map((q: any, idx: number) => {
                  const answer = simulation.aptitude.answers[idx];
                  const isCorrect = answer === q.correctAnswer;
                  return (
                    <div
                      key={idx}
                      className={`p-4 mb-3 rounded-lg ${
                        isCorrect ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <p className="font-medium text-gray-900 mb-2">
                        Q{idx + 1}: {q.question}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        Your Answer:{" "}
                        <span
                          className={
                            isCorrect
                              ? "text-green-600 font-semibold"
                              : "text-red-600"
                          }
                        >
                          {answer || "No answer"}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-600 font-semibold">
                          Correct Answer: {q.correctAnswer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Coding Round Details */}
            {simulation?.coding?.completed && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Code className="h-6 w-6 text-orange-500" />
                  Coding Round - {simulation.coding.score}%
                </h3>
                <p className="font-medium text-gray-900 mb-2">
                  {simulation.coding.questionTitle}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Language: {simulation.coding.language} | Test Cases:{" "}
                  {simulation.coding.testsPassed}/{simulation.coding.totalTests}{" "}
                  passed
                </p>
              </Card>
            )}

            {/* Technical Interview Details */}
            {simulation?.technicalInterview?.completed && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Video className="h-6 w-6 text-green-500" />
                  Technical Interview - {simulation.technicalInterview.score}%
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Feedback:</strong>{" "}
                  {simulation.technicalInterview.feedback}
                </p>
                {simulation.technicalInterview.questions?.map(
                  (q: string, idx: number) => (
                    <div key={idx} className="p-4 mb-3 rounded-lg bg-blue-50">
                      <p className="font-medium text-gray-900 mb-2">
                        Q{idx + 1}: {q}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Your Answer:</strong>{" "}
                        {simulation.technicalInterview.answers?.[idx] ||
                          "No answer"}
                      </p>
                    </div>
                  )
                )}
              </Card>
            )}

            {/* Managerial Interview Details */}
            {simulation?.managerialInterview?.completed && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-indigo-500" />
                  Managerial Interview - {simulation.managerialInterview.score}%
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Feedback:</strong>{" "}
                  {simulation.managerialInterview.feedback}
                </p>
                {simulation.managerialInterview.questions?.map(
                  (q: string, idx: number) => (
                    <div key={idx} className="p-4 mb-3 rounded-lg bg-indigo-50">
                      <p className="font-medium text-gray-900 mb-2">
                        Q{idx + 1}: {q}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Your Answer:</strong>{" "}
                        {simulation.managerialInterview.answers?.[idx] ||
                          "No answer"}
                      </p>
                    </div>
                  )
                )}
              </Card>
            )}

            {/* HR Interview Details */}
            {simulation?.hrInterview?.completed && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-pink-500" />
                  HR Interview - {simulation.hrInterview.score}%
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Feedback:</strong> {simulation.hrInterview.feedback}
                </p>
                {simulation.hrInterview.questions?.map(
                  (q: string, idx: number) => (
                    <div key={idx} className="p-4 mb-3 rounded-lg bg-pink-50">
                      <p className="font-medium text-gray-900 mb-2">
                        Q{idx + 1}: {q}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Your Answer:</strong>{" "}
                        {simulation.hrInterview.answers?.[idx] || "No answer"}
                      </p>
                    </div>
                  )
                )}
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentView("overview")}
              className="flex-1"
            >
              Back to Overview
            </Button>
            <Button
              variant="hero"
              onClick={startNewSimulation}
              disabled={stepLoading}
              className="flex-1"
            >
              Start New Simulation
              <Award className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Aptitude Test View
  if (currentView === "aptitude" && simulation) {
    return (
      <SimulationAptitude
        simulationId={simulation._id}
        onComplete={() => {
          loadActiveSimulation();
          setCurrentView("overview");
        }}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  // Coding Round View
  if (currentView === "coding" && simulation) {
    return (
      <SimulationCoding
        simulationId={simulation._id}
        onComplete={() => {
          loadActiveSimulation();
          setCurrentView("overview");
        }}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  // Technical Interview View
  if (currentView === "technical" && simulation) {
    return (
      <SimulationInterview
        simulationId={simulation._id}
        interviewType="technical"
        resumeText={simulation.resume?.text || ""}
        onComplete={() => {
          loadActiveSimulation();
          setCurrentView("overview");
        }}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  // Managerial Interview View
  if (currentView === "managerial" && simulation) {
    return (
      <SimulationInterview
        simulationId={simulation._id}
        interviewType="managerial"
        resumeText={simulation.resume?.text || ""}
        onComplete={() => {
          loadActiveSimulation();
          setCurrentView("overview");
        }}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  // HR Interview View
  if (currentView === "hr" && simulation) {
    return (
      <SimulationInterview
        simulationId={simulation._id}
        interviewType="hr"
        resumeText={simulation.resume?.text || ""}
        onComplete={() => {
          loadActiveSimulation();
          setCurrentView("overview");
        }}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  // Fallback - shouldn't reach here
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        <Button onClick={() => setCurrentView("overview")}>
          Back to Overview
        </Button>
      </div>
    </div>
  );
};

// Helper functions
const getStepScore = (stepId: number, simData: any): number => {
  if (!simData) return 0;

  switch (stepId) {
    case 0:
      return simData.resume?.score || 0;
    case 1:
      return simData.aptitude?.score || 0;
    case 2:
      return simData.coding?.score || 0;
    case 3:
      return simData.technicalInterview?.score || 0;
    case 4:
      return simData.managerialInterview?.score || 0;
    case 5:
      return simData.hrInterview?.score || 0;
    default:
      return 0;
  }
};

const getPerformanceRating = (score: number): string => {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  return "Needs Improvement";
};

export default PlacementSimulation;
