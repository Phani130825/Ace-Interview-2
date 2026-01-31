import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Users,
  Send,
  Settings,
  BarChart3,
  FileText,
  Play,
  Square,
  Zap,
} from "lucide-react";
import { groupDiscussionAPI } from "@/services/api";
import { discussionSocket } from "@/services/discussionSocket";
import { useAuth } from "@/contexts/AuthContext";

interface AgentPersonality {
  type: string;
  name: string;
  role: string;
  expertise: string;
  style: string;
}

interface Message {
  agent: string;
  name?: string;
  message: string;
  timestamp: Date;
}

interface GroupDiscussionProps {
  onNavigate?: (view: string) => void;
}

const GroupDiscussion: React.FC<GroupDiscussionProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<
    "setup" | "discussion" | "results"
  >("setup");
  const [topic, setTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AgentPersonality[]>(
    [],
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [discussionProgress, setDiscussionProgress] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [consensus, setConsensus] = useState<any>(null);
  const [focusAgent, setFocusAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize WebSocket
  useEffect(() => {
    if (user) {
      // Get auth token from localStorage or API
      const token = localStorage.getItem("token");
      if (token) {
        discussionSocket.connect(token);
      }

      // Register listeners
      discussionSocket.on(
        "discussion_initialized",
        handleDiscussionInitialized,
      );
      discussionSocket.on("new_message", handleNewMessage);
      discussionSocket.on("agent_response", handleAgentResponse);
      discussionSocket.on("discussion_progress", handleProgressUpdate);
      discussionSocket.on("discussion_summary", handleSummaryReceived);
      discussionSocket.on("consensus_analysis", handleConsensusReceived);

      return () => {
        discussionSocket.clearListeners();
        discussionSocket.disconnect();
      };
    }
  }, [user]);

  // Fetch available agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await groupDiscussionAPI.getAvailableAgents();
        if (response.data.success) {
          setAvailableAgents(response.data.agents);
          setSelectedAgents(
            response.data.agents
              .slice(0, 3)
              .map((a: AgentPersonality) => a.type),
          );
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };
    fetchAgents();
  }, []);

  const handleDiscussionInitialized = (data: any) => {
    setMessages([
      {
        agent: "facilitator",
        name: "Alex (Facilitator)",
        message: data.openingStatement,
        timestamp: new Date(),
      },
    ]);
    setCurrentView("discussion");
  };

  const handleNewMessage = (data: any) => {
    setMessages((prev) => [
      ...prev,
      {
        agent: data.agent,
        message: data.message,
        timestamp: data.timestamp,
      },
    ]);
  };

  const handleAgentResponse = (data: any) => {
    setMessages((prev) => [
      ...prev,
      {
        agent: data.agent,
        name: data.name,
        message: data.message,
        timestamp: data.timestamp,
      },
    ]);
  };

  const handleProgressUpdate = (data: any) => {
    setDiscussionProgress(data.progress);
  };

  const handleSummaryReceived = (data: any) => {
    setSummary(data.summary);
  };

  const handleConsensusReceived = (data: any) => {
    setConsensus(data.analysis);
  };

  const startDiscussion = async () => {
    if (!topic.trim() || selectedAgents.length === 0) {
      alert("Please enter a topic and select at least one agent");
      return;
    }

    try {
      setIsLoading(true);
      const response = await groupDiscussionAPI.initializeDiscussion({
        topic,
        selectedAgents,
        context: {},
      });

      if (response.data.success) {
        setSessionId(response.data.sessionId);
        setMessages([
          {
            agent: "facilitator",
            name: "Alex (Facilitator)",
            message: response.data.openingStatement,
            timestamp: new Date(),
          },
        ]);
        setCurrentView("discussion");
      }
    } catch (error) {
      console.error("Error starting discussion:", error);
      alert("Failed to start discussion");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage = inputMessage;
    setInputMessage("");

    try {
      // Emit via WebSocket for real-time experience
      discussionSocket.sendMessage(sessionId, userMessage, focusAgent);

      // Also call API to ensure persistence
      await groupDiscussionAPI.sendMessage(sessionId, {
        message: userMessage,
        focusAgent,
      });

      setFocusAgent(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const askAgent = async (agentType: string) => {
    if (!sessionId) return;

    const question = prompt(`Ask ${agentType} a question:`);
    if (!question) return;

    try {
      discussionSocket.askAgent(sessionId, agentType, question);
      await groupDiscussionAPI.askAgent(sessionId, {
        agentType,
        question,
      });
    } catch (error) {
      console.error("Error asking agent:", error);
    }
  };

  const getConsensus = async () => {
    if (!sessionId) return;
    try {
      await groupDiscussionAPI.getConsensus(sessionId);
      discussionSocket.requestConsensus(sessionId);
    } catch (error) {
      console.error("Error getting consensus:", error);
    }
  };

  const getSummary = async () => {
    if (!sessionId) return;
    try {
      await groupDiscussionAPI.getSummary(sessionId);
      discussionSocket.requestSummary(sessionId);
    } catch (error) {
      console.error("Error getting summary:", error);
    }
  };

  const endDiscussion = async () => {
    if (!sessionId) return;
    try {
      const response = await groupDiscussionAPI.endDiscussion(sessionId);
      if (response.data.success) {
        setSummary(response.data.finalReport.discussionSummary);
        setConsensus(response.data.finalReport.consensusAnalysis);
        setCurrentView("results");
      }
    } catch (error) {
      console.error("Error ending discussion:", error);
    }
  };

  // Setup View
  if (currentView === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🎭 Group Discussion AI Agents
            </h1>
            <p className="text-gray-600">
              Engage in dynamic conversations with multiple AI personalities
            </p>
          </div>

          <Card className="p-8 space-y-6">
            {/* Topic Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Discussion Topic
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a discussion topic (e.g., 'How to improve team productivity')"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Discussion Agents
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableAgents.map((agent) => (
                  <label
                    key={agent.type}
                    className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgents([...selectedAgents, agent.type]);
                        } else {
                          setSelectedAgents(
                            selectedAgents.filter((a) => a !== agent.type),
                          );
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {agent.name}
                      </p>
                      <p className="text-sm text-gray-600">{agent.role}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expertise: {agent.expertise}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={startDiscussion}
              disabled={
                !topic.trim() || selectedAgents.length === 0 || isLoading
              }
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Play className="h-5 w-5" />
              {isLoading ? "Starting..." : "Start Discussion"}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Discussion View
  if (currentView === "discussion" && sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="col-span-2 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-6 w-6" />
                  {topic}
                </h2>
                <Button
                  onClick={endDiscussion}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  End Discussion
                </Button>
              </div>

              {/* Messages */}
              <div className="space-y-4 h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.agent === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-sm p-3 rounded-lg ${
                        msg.agent === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-gray-300 text-gray-900"
                      }`}
                    >
                      {msg.name && msg.agent !== "user" && (
                        <p className="text-xs font-semibold text-blue-600 mb-1">
                          {msg.name}
                        </p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className="bg-blue-600 text-white px-6 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Agents */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </h3>
              <div className="space-y-2">
                {availableAgents
                  .filter((a) => selectedAgents.includes(a.type))
                  .map((agent) => (
                    <button
                      key={agent.type}
                      onClick={() => askAgent(agent.type)}
                      className="w-full text-left p-2 rounded-lg hover:bg-blue-50 border border-gray-300"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-600">{agent.role}</p>
                    </button>
                  ))}
              </div>
            </Card>

            {/* Progress */}
            {discussionProgress && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Progress
                </h3>
                <div className="space-y-2 text-sm">
                  <p>Total Turns: {discussionProgress.totalTurns}</p>
                  <p>
                    Duration: {Math.round(discussionProgress.duration / 1000)}s
                  </p>
                </div>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-4 space-y-2">
              <Button
                onClick={getConsensus}
                className="w-full bg-green-600 text-white text-sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Get Consensus
              </Button>
              <Button
                onClick={getSummary}
                className="w-full bg-purple-600 text-white text-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Get Summary
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (currentView === "results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Discussion Results
            </h1>
            <Button
              onClick={() => setCurrentView("setup")}
              className="bg-blue-600 text-white"
            >
              Start New Discussion
            </Button>
          </div>

          {/* Summary */}
          {summary && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
            </Card>
          )}

          {/* Consensus */}
          {consensus && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Consensus Analysis
              </h2>
              <div className="space-y-4">
                {typeof consensus === "string" ? (
                  <p className="text-gray-700">{consensus}</p>
                ) : (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(consensus, null, 2)}
                  </pre>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default GroupDiscussion;
