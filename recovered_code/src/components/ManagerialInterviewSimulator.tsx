import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

type LogEntry = {
  speaker:
    | "System"
    | "Interviewer"
    | "You"
    | "Feedback"
    | "Enhancement"
    | "Error";
  text: string;
  timestamp: number;
};

type InterviewState = "setup" | "in-progress" | "feedback";

const ManagerialInterviewSimulator = () => {
  // State Management
  const [jobDetails, setJobDetails] = useState({
    role: "",
    company: "",
    resumeText: "",
  });
  const [interviewState, setInterviewState] = useState<InterviewState>("setup");
  const [loading, setLoading] = useState(false);
  const [interviewLog, setInterviewLog] = useState<LogEntry[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [interviewType] = useState<string>("Managerial");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [questionCount, setQuestionCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const { toast } = useToast();

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
      setUserAnswer(transcript);
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
    };
  }, [toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [interviewLog]);

  // Poll for session updates (alternative to Socket.IO)
  useEffect(() => {
    if (!sessionId || interviewState === "setup") return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/ai-interview/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success && response.data.session) {
          setInterviewLog(response.data.session.log || []);
          setInterviewState(response.data.session.state);
        }
      } catch (error) {
        console.error("Error polling session:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, interviewState]);

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
    };

    utterance.onend = () => {
      console.log("Speech ended");
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
    };

    speechSynthesis.speak(utterance);
  };

  const startInterview = async () => {
    if (jobDetails.role.trim() === "" || jobDetails.company.trim() === "") {
      toast({
        title: "Missing Information",
        description: "Please fill in the job role and company details.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call Gemini API directly for interview setup
      const introPrompt = `You are Robert Martinez, a Chief Operating Officer with 18 years of leadership experience across Fortune 500 companies. You are conducting a managerial interview for the following position.

Your interviewing style:
- Professional and strategic in your approach
- Focus on leadership philosophy and management style
- Ask scenario-based questions about decision-making
- Assess strategic thinking and business acumen
- Explore conflict management and team dynamics
- Evaluate change management capabilities
- Inquire about metrics, KPIs, and results orientation
- Test understanding of organizational dynamics

Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Candidate's Resume:
${jobDetails.resumeText}

Introduce yourself as Robert Martinez and ask your first managerial question. Focus on:
- Leadership style and philosophy
- Strategic planning and execution
- Team building and talent development
- Decision-making under pressure
- Change management and adaptability
- Stakeholder management
- Budget and resource allocation
- Performance metrics and accountability
- Conflict resolution at scale
- Business acumen and market awareness

Start with a professional introduction and your first strategic question.`;

      const initialChatHistory = [
        { role: "user", parts: [{ text: introPrompt }] },
      ];
      const payload = { contents: initialChatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const result = await response.json();
      const text =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I could not generate a response. Please try again.";

      const initialLog: LogEntry[] = [
        {
          speaker: "System" as const,
          text: `Starting managerial interview simulation...`,
          timestamp: Date.now(),
        },
        {
          speaker: "Interviewer" as const,
          text: text,
          timestamp: Date.now() + 100,
        },
        {
          speaker: "System" as const,
          text: "Preparing audio...",
          timestamp: Date.now() + 200,
        },
      ];

      setInterviewLog(initialLog);
      setInterviewState("in-progress");
      setChatHistory([
        ...initialChatHistory,
        { role: "model", parts: [{ text: text }] },
      ]);
      setQuestionCount(1);

      // Speak the greeting using TTS
      speakText(text);

      // Remove the "Preparing audio..." message after playback begins
      setInterviewLog((prevLog) =>
        prevLog.filter((entry) => entry.text !== "Preparing audio...")
      );

      toast({
        title: "Managerial Interview Started",
        description: "This is a Managerial interview.",
      });
    } catch (error: any) {
      console.error("Error starting interview:", error);
      toast({
        title: "Error",
        description: "Failed to start the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnswer = async () => {
    if (userAnswer.trim() === "") return;

    // Check if user wants to end interview
    if (userAnswer.trim().toUpperCase() === "THANK YOU") {
      setLoading(true);
      const currentAnswer = userAnswer;
      setUserAnswer("");

      const userLogEntry: LogEntry = {
        speaker: "You",
        text: currentAnswer,
        timestamp: Date.now(),
      };
      setInterviewLog((prev) => [...prev, userLogEntry]);

      const updatedChatHistory = [
        ...chatHistory,
        { role: "user", parts: [{ text: currentAnswer }] },
      ];

      try {
        const feedbackPrompt = `The candidate has concluded the interview by saying "${currentAnswer}". As Robert Martinez, provide professional executive-level feedback.

Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Conversation:
${updatedChatHistory
  .map(
    (msg) =>
      `${msg.role === "user" ? "Candidate" : "Robert Martinez"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

As Robert Martinez, acknowledge professionally and provide strategic feedback covering:
1. Leadership potential and management readiness
2. Strategic thinking demonstrated
3. Decision-making approach
4. Communication at executive level
5. Business acumen indicators
6. Areas of strength
7. Development opportunities
8. Overall assessment for the role`;

        const feedbackPayload = {
          contents: [{ role: "user", parts: [{ text: feedbackPrompt }] }],
        };
        const feedbackResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(feedbackPayload),
          }
        );

        if (feedbackResponse.ok) {
          const feedbackResult = await feedbackResponse.json();
          const feedbackText =
            feedbackResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Thank you for your time. We'll be in touch regarding next steps.";

          const feedbackLogEntry: LogEntry = {
            speaker: "Feedback",
            text: feedbackText,
            timestamp: Date.now(),
          };
          setInterviewLog((prev) => [...prev, feedbackLogEntry]);
        }
      } catch (error) {
        console.error("Error generating feedback:", error);
      }

      setInterviewState("feedback");
      setLoading(false);
      toast({
        title: "Interview Ended",
        description:
          "Thank you for participating in this managerial interview.",
      });
      return;
    }

    // Stop listening before processing
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.stop();
    }

    setLoading(true);
    const currentAnswer = userAnswer;
    setUserAnswer("");

    // Add user's answer to log
    const userLogEntry: LogEntry = {
      speaker: "You",
      text: currentAnswer,
      timestamp: Date.now(),
    };
    setInterviewLog((prev) => [...prev, userLogEntry]);

    try {
      // Update chat history with user's answer
      const updatedChatHistory = [
        ...chatHistory,
        { role: "user", parts: [{ text: currentAnswer }] },
      ];
      setChatHistory(updatedChatHistory);

      const newQuestionCount = questionCount + 1;
      setQuestionCount(newQuestionCount);

      if (newQuestionCount >= 5) {
        // Generate final feedback
        const feedbackPrompt = `As Robert Martinez, provide comprehensive executive-level feedback on the candidate's managerial interview performance.

Interview Type: Managerial
Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Complete Interview Conversation:
${updatedChatHistory
  .map(
    (msg, index) =>
      `${msg.role === "user" ? "Candidate" : "Robert Martinez"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

Provide detailed feedback as Robert Martinez covering:
1. Leadership potential and management capability
2. Strategic thinking and vision
3. Decision-making under complexity and pressure
4. Business acumen and financial understanding
5. Team development and talent management approach
6. Change management and adaptability
7. Executive communication effectiveness
8. Stakeholder management capabilities
9. Key strengths and leadership qualities
10. Development areas with executive-level guidance
11. Overall assessment for the managerial/leadership role`;

        const feedbackPayload = {
          contents: [{ role: "user", parts: [{ text: feedbackPrompt }] }],
        };
        const feedbackResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(feedbackPayload),
          }
        );

        if (!feedbackResponse.ok) {
          throw new Error(`Gemini API Error: ${feedbackResponse.status}`);
        }

        const feedbackResult = await feedbackResponse.json();
        const feedbackText =
          feedbackResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Unable to generate feedback.";

        const feedbackLogEntry: LogEntry = {
          speaker: "Feedback",
          text: feedbackText,
          timestamp: Date.now(),
        };
        setInterviewLog((prev) => [...prev, feedbackLogEntry]);
        setInterviewState("feedback");

        toast({
          title: "Interview Complete",
          description: "Your managerial interview session has concluded.",
        });
      } else {
        // Generate next question
        const nextQuestionPrompt = `You are Robert Martinez continuing this managerial interview for the ${
          jobDetails.role
        } position at ${jobDetails.company}.

Your executive interviewing approach:
- Ask strategic, scenario-based questions
- Assess leadership philosophy and management style
- Evaluate decision-making in complex situations
- Test understanding of P&L, metrics, and business drivers
- Explore change management experience
- Assess ability to balance competing priorities
- Evaluate stakeholder management at all levels

Candidate's Resume:
${jobDetails.resumeText}

Previous conversation:
${updatedChatHistory
  .slice(0, -1)
  .map(
    (msg, index) =>
      `${msg.role === "user" ? "Candidate" : "Robert Martinez"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

Candidate's last answer: ${currentAnswer}

Based on their response, ask your next managerial question focusing on:
- Strategic leadership and vision
- Team scaling and organizational design
- Performance management and accountability
- Budget and resource optimization
- Crisis management and difficult decisions
- Cross-functional collaboration
- Innovation and continuous improvement

Ask one clear, strategic question:`;

        const questionPayload = {
          contents: [{ role: "user", parts: [{ text: nextQuestionPrompt }] }],
        };
        const questionResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionPayload),
          }
        );

        if (!questionResponse.ok) {
          throw new Error(`Gemini API Error: ${questionResponse.status}`);
        }

        const questionResult = await questionResponse.json();
        const nextQuestion =
          questionResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "What are your career goals?";

        // Add interviewer's question to log
        const interviewerLogEntry: LogEntry = {
          speaker: "Interviewer",
          text: nextQuestion,
          timestamp: Date.now(),
        };
        setInterviewLog((prev) => [...prev, interviewerLogEntry]);

        // Update chat history with AI's response
        setChatHistory((prev) => [
          ...prev,
          { role: "model", parts: [{ text: nextQuestion }] },
        ]);

        // Speak the next question
        speakText(nextQuestion);
      }
    } catch (error: any) {
      console.error("Error processing answer:", error);
      toast({
        title: "Error",
        description: "Failed to process your answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setUserAnswer("");
      speechRecognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const resetInterview = () => {
    if (sessionId) {
      const token = localStorage.getItem("token");
      axios
        .post(
          `${API_BASE_URL}/api/ai-interview/${sessionId}/reset`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(console.error);
    }

    setInterviewState("setup");
    setInterviewLog([]);
    setSessionId(null);
    setJobDetails({ role: "", company: "", resumeText: "" });
    setUserAnswer("");
    setChatHistory([]);
    setQuestionCount(0);
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case "You":
        return "bg-primary/10 border-primary/20";
      case "Interviewer":
        return "bg-secondary/10 border-secondary/20";
      case "Feedback":
        return "bg-blue-50 border-blue-200";
      case "Enhancement":
        return "bg-green-50 border-green-200";
      case "System":
        return "bg-gray-50 border-gray-200";
      case "Error":
        return "bg-destructive/10 border-destructive/20";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const renderSetup = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Managerial Interview Setup
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Enter your details to begin your AI-powered managerial interview
          simulation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role">Job Role</Label>
          <Input
            id="role"
            type="text"
            value={jobDetails.role}
            onChange={(e) =>
              setJobDetails({ ...jobDetails, role: e.target.value })
            }
            placeholder="e.g., Product Manager, Team Lead"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            type="text"
            value={jobDetails.company}
            onChange={(e) =>
              setJobDetails({ ...jobDetails, company: e.target.value })
            }
            placeholder="e.g., Google, Microsoft, Amazon"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume">Your Resume Text</Label>
          <Textarea
            id="resume"
            value={jobDetails.resumeText}
            onChange={(e) =>
              setJobDetails({ ...jobDetails, resumeText: e.target.value })
            }
            rows={8}
            placeholder="Paste your resume text here to give the AI context about your background and experience..."
            className="resize-none"
          />
        </div>
        <Button
          onClick={startInterview}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Interview...
            </>
          ) : (
            "Start Managerial Interview"
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderInProgress = () => (
    <Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Managerial Interview Simulator
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {interviewType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {interviewLog.map((entry, index) => (
              <div
                key={index}
                className={`flex ${
                  entry.speaker === "You" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] p-4 rounded-lg border ${getSpeakerColor(
                    entry.speaker
                  )}`}
                >
                  <p className="font-semibold text-sm mb-1">{entry.speaker}</p>
                  <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {isListening && (
              <div className="flex justify-center items-center space-x-2 text-muted-foreground">
                <div className="animate-pulse w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm">Listening...</span>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processAnswer();
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer or click the microphone to speak..."
              disabled={isListening || loading}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              variant={isListening ? "destructive" : "secondary"}
              size="icon"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={loading || userAnswer.trim() === ""}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeedback = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Managerial Interview Complete!
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Your managerial interview session has concluded. Review the
          conversation below.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-96 rounded-lg border p-4">
          <div className="space-y-3">
            {interviewLog.map((entry, index) => (
              <div
                key={index}
                className={`${
                  entry.speaker === "You" ? "text-right" : "text-left"
                }`}
              >
                <p className="font-semibold text-sm text-muted-foreground">
                  {entry.speaker}:
                </p>
                <p className="text-sm mt-1">{entry.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button onClick={resetInterview} className="w-full" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Start a New Interview
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full">
        {interviewState === "setup" && renderSetup()}
        {interviewState === "in-progress" && renderInProgress()}
        {interviewState === "feedback" && renderFeedback()}
      </div>
    </div>
  );
};

export default ManagerialInterviewSimulator;
