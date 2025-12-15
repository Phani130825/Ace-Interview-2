import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Settings,
  Calendar,
  Trophy,
  Clock,
  Target,
  FileText,
  Video,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getInterviewSessions,
  getAptitudeTests,
  getCodingTests,
  type InterviewSession,
  type AptitudeTestResult,
  type CodingTestResult,
} from "@/services/testStorage";

interface DashboardProps {
  onNavigate: (
    view:
      | "landing"
      | "dashboard"
      | "upload"
      | "tailoring"
      | "aptitude"
      | "coding"
      | "interview"
      | "analytics"
      | "allSessions"
      | "schedule"
      | "settings"
      | "pipelines"
      | "resume-pdf"
      | "performance"
  ) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user } = useAuth();

  // Real-time data state
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [overallProgress, setOverallProgress] = useState({
    interviewSkills: 0,
    confidenceLevel: 0,
    technicalKnowledge: 0,
  });

  // Load real-time data
  useEffect(() => {
    const loadDashboardData = async () => {
      // Check if user is logged in
      if (!user) {
        console.log("No user logged in, skipping data load");
        return;
      }

      try {
        // Fetch all data once - avoid duplicate calls
        const [interviews, aptitudeTests] = await Promise.all([
          getInterviewSessions().catch(() => []),
          getAptitudeTests().catch(() => []),
        ]);
        const codingTests = getCodingTests();

        // Calculate performance stats from fetched data
        let aptitudeSum = 0;
        for (const test of aptitudeTests) {
          aptitudeSum += test.percentage;
        }

        let codingSum = 0;
        for (const test of codingTests) {
          codingSum += test.percentage;
        }

        const stats = {
          aptitude: {
            total: aptitudeTests.length,
            averageScore:
              aptitudeTests.length > 0 ? aptitudeSum / aptitudeTests.length : 0,
          },
          coding: {
            total: codingTests.length,
            averageScore:
              codingTests.length > 0 ? codingSum / codingTests.length : 0,
          },
          interviews: {
            total: interviews.length,
            byType: {
              technical: interviews.filter(
                (s: any) => s.interviewType === "technical"
              ).length,
              hr: interviews.filter((s: any) => s.interviewType === "hr")
                .length,
              managerial: interviews.filter(
                (s: any) => s.interviewType === "managerial"
              ).length,
              ai: interviews.filter((s: any) => s.interviewType === "ai")
                .length,
            },
          },
        };
        setPerformanceStats(stats);

        // Combine and sort all sessions by timestamp
        const allSessions: any[] = [
          ...interviews.map((session: InterviewSession) => ({
            type: `${
              session.interviewType.charAt(0).toUpperCase() +
              session.interviewType.slice(1)
            } Interview`,
            company: session.company || "Practice Session",
            score: Math.round(Math.random() * 30 + 70), // Placeholder until we have scoring
            date: formatDate(session.timestamp),
            duration: session.duration
              ? `${Math.floor(session.duration / 60)} min`
              : "N/A",
            timestamp: session.timestamp,
          })),
          ...aptitudeTests.map((test: AptitudeTestResult) => ({
            type: "Aptitude Test",
            company: "Practice Session",
            score: Math.round(test.percentage),
            date: formatDate(test.timestamp),
            duration: test.timeTaken
              ? `${Math.floor(test.timeTaken / 60)} min`
              : "N/A",
            timestamp: test.timestamp,
          })),
          ...codingTests.map((test: CodingTestResult) => ({
            type: "Coding Challenge",
            company: "Practice Session",
            score: Math.round(test.percentage),
            date: formatDate(test.timestamp),
            duration: test.timeTaken
              ? `${Math.floor(test.timeTaken / 60)} min`
              : "N/A",
            timestamp: test.timestamp,
          })),
        ];

        // Sort by timestamp and take top 3
        allSessions.sort((a, b) => b.timestamp - a.timestamp);
        setRecentSessions(allSessions.slice(0, 3));

        // Calculate overall progress
        const interviewAvg =
          stats.interviews.total > 0
            ? Math.min(95, 60 + stats.interviews.total * 5)
            : 0;
        const technicalAvg = stats.coding.averageScore || 0;
        const confidenceAvg = stats.aptitude.averageScore || 0;

        setOverallProgress({
          interviewSkills: Math.round(interviewAvg),
          confidenceLevel: Math.round(confidenceAvg),
          technicalKnowledge: Math.round(technicalAvg),
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    // Only load once when user is available
    if (user) {
      loadDashboardData();
    }
  }, [user?._id]); // Only trigger when userId changes (login/logout)

  // Helper function to format timestamp
  const formatDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || "User"}! 👋
          </h1>
          <p className="text-gray-600">
            Continue your interview preparation journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Success Rate</p>
                <p className="text-2xl font-bold">
                  {performanceStats
                    ? `${Math.round(
                        (performanceStats.aptitude.averageScore +
                          performanceStats.coding.averageScore) /
                          2
                      )}%`
                    : "0%"}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Sessions Completed</p>
                <p className="text-2xl font-bold">
                  {performanceStats
                    ? performanceStats.interviews.total +
                      performanceStats.aptitude.total +
                      performanceStats.coding.total
                    : 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Interviews Done</p>
                <p className="text-2xl font-bold">
                  {performanceStats ? performanceStats.interviews.total : 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Avg Score</p>
                <p className="text-2xl font-bold">
                  {performanceStats &&
                  performanceStats.aptitude.total +
                    performanceStats.coding.total >
                    0
                    ? Math.round(
                        (performanceStats.aptitude.averageScore *
                          performanceStats.aptitude.total +
                          performanceStats.coding.averageScore *
                            performanceStats.coding.total) /
                          (performanceStats.aptitude.total +
                            performanceStats.coding.total)
                      )
                    : 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-200" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* All Modules */}
            {user && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Separate Access
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Aptitude Test
                        </h3>
                        <p className="text-sm text-gray-600">
                          Test your logical and quantitative skills with
                          AI-generated questions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate("aptitude")}
                    >
                      Access Aptitude Test
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Coding Round
                        </h3>
                        <p className="text-sm text-gray-600">
                          Practice coding problems and algorithms for technical
                          interviews
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate("coding")}
                    >
                      Access Coding Round
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-red-50 to-red-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Video className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Managerial Interview Simulator
                        </h3>
                        <p className="text-sm text-gray-600">
                          Dedicated practice for managerial roles with
                          leadership and strategy questions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() =>
                        (window.location.href = "/managerial-interview")
                      }
                    >
                      Start Managerial Interview
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-yellow-50 to-yellow-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Video className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          HR Interview Simulator
                        </h3>
                        <p className="text-sm text-gray-600">
                          Dedicated practice for HR roles with company culture
                          and employee relations questions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => (window.location.href = "/hr-interview")}
                    >
                      Start HR Interview
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Video className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Technical Interview Simulator
                        </h3>
                        <p className="text-sm text-gray-600">
                          Dedicated practice for technical roles with coding and
                          system design questions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() =>
                        (window.location.href = "/technical-interview")
                      }
                    >
                      Start Technical Interview
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-cyan-50 to-cyan-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-cyan-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Resume PDF Generator
                        </h3>
                        <p className="text-sm text-gray-600">
                          Generate professional PDF resumes from your data
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate("resume-pdf")}
                    >
                      Access Resume PDF Generator
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate("performance")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Performance Report</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate("schedule")}
                >
                  <Calendar className="h-6 w-6" />
                  <span>Schedule Practice</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate("settings")}
                >
                  <Settings className="h-6 w-6" />
                  <span>Settings</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate("pipelines")}
                >
                  <FileText className="h-6 w-6" />
                  <span>Pipeline Dashboard</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Sessions */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Recent Sessions</h3>
              <div className="space-y-4">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {session.type}
                        </h4>
                        <span className="text-2xl font-bold text-brand-primary">
                          {session.score}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {session.company}
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{session.date}</span>
                        <span>{session.duration}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                    <p>
                      No sessions yet. Start practicing to see your progress!
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => onNavigate("allSessions")}
              >
                View All Sessions
              </Button>
            </Card>

            {/* Progress Overview */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Overall Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Interview Skills</span>
                    <span>{overallProgress.interviewSkills}%</span>
                  </div>
                  <Progress
                    value={overallProgress.interviewSkills}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Aptitude & Logic</span>
                    <span>{overallProgress.confidenceLevel}%</span>
                  </div>
                  <Progress
                    value={overallProgress.confidenceLevel}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Technical Knowledge</span>
                    <span>{overallProgress.technicalKnowledge}%</span>
                  </div>
                  <Progress
                    value={overallProgress.technicalKnowledge}
                    className="h-2"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
