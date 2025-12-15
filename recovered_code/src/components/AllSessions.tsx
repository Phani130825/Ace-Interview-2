import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  X,
  Calendar,
  Clock,
  Award,
  Code,
  MessageSquare,
  TrendingUp,
  Filter,
  Search,
} from "lucide-react";
import {
  getInterviewSessions,
  getAptitudeTests,
  getCodingTests,
  type InterviewSession,
  type AptitudeTestResult,
  type CodingTestResult,
} from "@/services/testStorage";

interface AllSessionsProps {
  onNavigate: (view: "dashboard") => void;
}

type SessionType = "all" | "interview" | "aptitude" | "coding";

interface UnifiedSession {
  id: string;
  timestamp: number;
  type: "interview" | "aptitude" | "coding";
  title: string;
  subtitle: string;
  score?: number;
  percentage?: number;
  details: any;
}

export default function AllSessions({ onNavigate }: AllSessionsProps) {
  const [allSessions, setAllSessions] = useState<UnifiedSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<UnifiedSession[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<SessionType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadAllSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allSessions, filterType, searchQuery]);

  const loadAllSessions = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [interviews, aptitudeTests, codingTests] = await Promise.all([
        getInterviewSessions(),
        getAptitudeTests(),
        getCodingTests(),
      ]);

      // Transform all sessions into a unified format
      const unified: UnifiedSession[] = [];

      // Add interview sessions
      interviews.forEach((session: InterviewSession) => {
        unified.push({
          id: session.id,
          timestamp: session.timestamp,
          type: "interview",
          title: `${
            session.interviewType.charAt(0).toUpperCase() +
            session.interviewType.slice(1)
          } Interview`,
          subtitle: `${session.jobRole} at ${session.company}`,
          details: session,
        });
      });

      // Add aptitude tests
      aptitudeTests.forEach((test: AptitudeTestResult) => {
        unified.push({
          id: test.id,
          timestamp: test.timestamp,
          type: "aptitude",
          title: "Aptitude Test",
          subtitle: `${test.score}/${test.totalQuestions} questions`,
          score: test.score,
          percentage: test.percentage,
          details: test,
        });
      });

      // Add coding tests
      codingTests.forEach((test: CodingTestResult) => {
        unified.push({
          id: test.id,
          timestamp: test.timestamp,
          type: "coding",
          title: "Coding Challenge",
          subtitle: test.questionTitle,
          score: test.passedTestCases,
          percentage: test.percentage,
          details: test,
        });
      });

      // Sort by timestamp (newest first)
      unified.sort((a, b) => b.timestamp - a.timestamp);

      setAllSessions(unified);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allSessions];

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((session) => session.type === filterType);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.subtitle.toLowerCase().includes(query)
      );
    }

    setFilteredSessions(filtered);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "interview":
        return <MessageSquare className="w-5 h-5" />;
      case "aptitude":
        return <Award className="w-5 h-5" />;
      case "coding":
        return <Code className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case "interview":
        return "bg-blue-100 text-blue-600";
      case "aptitude":
        return "bg-purple-100 text-purple-600";
      case "coding":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleBack = () => {
    setShowConfirmModal(true);
  };

  const confirmBack = () => {
    setShowConfirmModal(false);
    onNavigate("dashboard");
  };

  const cancelBack = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Sessions</h1>
              <p className="text-gray-600 mt-1">
                Complete history of your practice sessions
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allSessions.length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Interviews</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allSessions.filter((s) => s.type === "interview").length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aptitude Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allSessions.filter((s) => s.type === "aptitude").length}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coding Challenges</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allSessions.filter((s) => s.type === "coding").length}
                </p>
              </div>
              <Code className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterType === "interview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("interview")}
                >
                  Interviews
                </Button>
                <Button
                  variant={filterType === "aptitude" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("aptitude")}
                >
                  Aptitude
                </Button>
                <Button
                  variant={filterType === "coding" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("coding")}
                >
                  Coding
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-600" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Sessions List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-xl font-semibold text-gray-600 mb-2">
              No sessions found
            </p>
            <p className="text-gray-500">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your filters or search query"
                : "Start practicing to see your sessions here"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg ${getSessionColor(
                        session.type
                      )} flex items-center justify-center flex-shrink-0`}
                    >
                      {getSessionIcon(session.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.title}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {session.subtitle}
                          </p>
                        </div>

                        {/* Score */}
                        {session.percentage !== undefined && (
                          <div className="text-right">
                            <div
                              className={`text-2xl font-bold ${getScoreColor(
                                session.percentage
                              )}`}
                            >
                              {session.percentage.toFixed(0)}%
                            </div>
                            <p className="text-sm text-gray-500">Score</p>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.timestamp)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(session.timestamp)}
                        </div>
                        {session.type === "aptitude" && session.details && (
                          <span>
                            {session.details.totalQuestions} questions
                          </span>
                        )}
                        {session.type === "coding" && session.details && (
                          <span>
                            {session.details.passedTestCases}/
                            {session.details.totalTestCases} test cases passed
                          </span>
                        )}
                        {session.type === "interview" && session.details && (
                          <span>
                            {session.details.chatLog?.length || 0} messages
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <ArrowLeft className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Leave All Sessions?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to go back to the dashboard?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelBack}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={confirmBack} className="flex-1">
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
