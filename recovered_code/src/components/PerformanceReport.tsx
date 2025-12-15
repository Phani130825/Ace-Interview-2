import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Code,
  MessageSquare,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  getPerformanceStats,
  getAptitudeTests,
  getCodingTests,
  getInterviewSessions,
  AptitudeTestResult,
  CodingTestResult,
  InterviewSession,
} from "@/services/testStorage";

const PerformanceReport = () => {
  const [stats, setStats] = useState<any>(null);
  const [aptitudeTests, setAptitudeTests] = useState<AptitudeTestResult[]>([]);
  const [codingTests, setCodingTests] = useState<CodingTestResult[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<
    InterviewSession[]
  >([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, aptitudeData, interviewData] = await Promise.all([
        getPerformanceStats(),
        getAptitudeTests(),
        getInterviewSessions(),
      ]);

      setStats(statsData);
      setAptitudeTests(aptitudeData.sort((a, b) => b.timestamp - a.timestamp));
      setCodingTests(
        getCodingTests().sort((a, b) => b.timestamp - a.timestamp)
      );
      setInterviewSessions(
        interviewData.sort((a, b) => b.timestamp - a.timestamp)
      );
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Performance Report
            </h1>
            <p className="text-gray-600 mt-1">
              Track your progress across all assessments
            </p>
          </div>
          <Button onClick={loadData} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Aptitude Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.aptitude.total}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avg: {stats.aptitude.averageScore.toFixed(1)}%
                  </p>
                </div>
                <Trophy className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Coding Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.coding.total}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avg: {stats.coding.averageScore.toFixed(1)}%
                  </p>
                </div>
                <Code className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Interview Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.interviews.total}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    <span>Tech: {stats.interviews.byType.technical}</span>
                    <span>HR: {stats.interviews.byType.hr}</span>
                    <span>Mgmt: {stats.interviews.byType.managerial}</span>
                  </div>
                </div>
                <MessageSquare className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="aptitude" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="aptitude">Aptitude Tests</TabsTrigger>
                <TabsTrigger value="coding">Coding Tests</TabsTrigger>
                <TabsTrigger value="interviews">Interview Sessions</TabsTrigger>
              </TabsList>

              {/* Aptitude Tests Tab */}
              <TabsContent value="aptitude" className="space-y-4">
                {aptitudeTests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No aptitude tests completed yet
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {aptitudeTests.map((test) => (
                        <Card
                          key={test.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() =>
                            setSelectedTest({ type: "aptitude", data: test })
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge
                                    variant={
                                      test.percentage >= 70
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    Score: {test.score}/{test.totalQuestions}
                                  </Badge>
                                  <span
                                    className={`text-2xl font-bold ${getScoreColor(
                                      test.percentage
                                    )}`}
                                  >
                                    {test.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(test.timestamp)}
                                  </span>
                                  {test.timeTaken && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {formatDuration(test.timeTaken)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <TrendingUp className="h-6 w-6 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Coding Tests Tab */}
              <TabsContent value="coding" className="space-y-4">
                {codingTests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No coding tests completed yet
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {codingTests.map((test) => (
                        <Card key={test.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2">
                                  {test.questionTitle}
                                </h3>
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant="outline">
                                    {test.language}
                                  </Badge>
                                  <Badge
                                    variant={
                                      test.submissionStatus === "completed"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {test.submissionStatus}
                                  </Badge>
                                  <span
                                    className={`text-xl font-bold ${getScoreColor(
                                      test.percentage
                                    )}`}
                                  >
                                    {test.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {test.passedTestCases}/{test.totalTestCases}{" "}
                                    passed
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(test.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <Code className="h-6 w-6 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Interview Sessions Tab */}
              <TabsContent value="interviews" className="space-y-4">
                {interviewSessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No interview sessions completed yet
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {interviewSessions.map((session) => (
                        <Card
                          key={session.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() =>
                            setSelectedTest({
                              type: "interview",
                              data: session,
                            })
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg">
                                    {session.interviewType
                                      .charAt(0)
                                      .toUpperCase() +
                                      session.interviewType.slice(1)}{" "}
                                    Interview
                                  </h3>
                                  <Badge
                                    variant={
                                      session.status === "completed"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {session.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Interviewer:</strong>{" "}
                                  {session.interviewerName}
                                </p>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Role:</strong> {session.jobRole} at{" "}
                                  {session.company}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    {session.chatLog.length} messages
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(session.timestamp)}
                                  </span>
                                  {session.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {formatDuration(session.duration)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Detailed View Modal */}
        {selectedTest && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTest(null)}
          >
            <Card
              className="max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>
                  {selectedTest.type === "aptitude" && "Aptitude Test Details"}
                  {selectedTest.type === "interview" &&
                    "Interview Session Details"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {selectedTest.type === "aptitude" && (
                    <div className="space-y-4">
                      {selectedTest.data.questions.map(
                        (q: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <p className="font-semibold mb-2">
                              {idx + 1}. {q.question}
                            </p>
                            <div className="space-y-1 mb-3">
                              {q.options.map((opt: string, optIdx: number) => (
                                <p
                                  key={optIdx}
                                  className={`text-sm pl-4 ${
                                    opt === q.correctAnswer
                                      ? "text-green-600 font-medium"
                                      : opt === q.userAnswer
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                  {opt === q.correctAnswer && " ✓"}
                                  {opt === q.userAnswer &&
                                    opt !== q.correctAnswer &&
                                    " ✗"}
                                </p>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              {q.isCorrect ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" /> Correct
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" /> Incorrect
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {selectedTest.type === "interview" && (
                    <div className="space-y-4">
                      {selectedTest.data.chatLog.map(
                        (msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg ${
                              msg.speaker === "You"
                                ? "bg-blue-50 ml-8"
                                : "bg-gray-50 mr-8"
                            }`}
                          >
                            <p className="font-semibold text-sm mb-1">
                              {msg.speaker}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          </div>
                        )
                      )}
                      {selectedTest.data.feedback && (
                        <div className="border-t pt-4 mt-4">
                          <h3 className="font-semibold mb-2">Feedback:</h3>
                          <p className="text-sm whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg">
                            {selectedTest.data.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t flex justify-end">
                <Button onClick={() => setSelectedTest(null)}>Close</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceReport;
