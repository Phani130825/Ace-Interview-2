import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, RotateCcw, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import {
  saveInterviewSession,
  updateInterviewSession,
} from "@/services/testStorage";
import { generateContent } from "@/services/geminiService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

interface TechnicalInterviewSimulatorProps {
  onNavigate?: (view: string) => void;
}

const TechnicalInterviewSimulator = ({
  onNavigate,
}: TechnicalInterviewSimulatorProps = {}) => {
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
  const [interviewType] = useState<string>("Technical");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [interviewStartTime, setInterviewStartTime] = useState<number>(0);
  const [showBackConfirm, setShowBackConfirm] = useState<boolean>(false);

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

  // Update interview session storage whenever log changes
  useEffect(() => {
    if (currentSessionId && interviewLog.length > 0) {
      const duration =
        interviewStartTime > 0
          ? Math.floor((Date.now() - interviewStartTime) / 1000)
          : 0;
      const feedbackEntry = interviewLog.find(
        (entry) => entry.speaker === "Feedback"
      );

      updateInterviewSession(currentSessionId, {
        chatLog: interviewLog.map((entry) => ({
          speaker: entry.speaker,
          text: entry.text,
          timestamp: entry.timestamp,
        })),
        duration,
        feedback: feedbackEntry?.text,
        status: interviewState === "feedback" ? "completed" : "in-progress",
      });
    }
  }, [interviewLog, currentSessionId, interviewState, interviewStartTime]);

  // Note: Using direct Gemini API calls, no backend polling needed

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
      const introPrompt = `You are Dr. Sarah Chen, a Senior Technical Architect with 15 years of experience in software engineering and system design. You are conducting a technical interview for the following position.

Your interviewing style:
- Start with a warm, professional greeting introducing yourself
- Ask clear, structured technical questions that assess depth of knowledge
- Follow up on answers with probing questions to test understanding
- Focus on problem-solving approach, not just memorized answers
- Ask about trade-offs, scalability, and real-world applications
- Gradually increase difficulty based on candidate responses
- Be encouraging but thorough in your assessment

Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Candidate's Resume:
${jobDetails.resumeText}

Provide your introduction as Dr. Sarah Chen and ask the first technical question. Focus on:
- Core programming concepts and language proficiency
- Data structures and algorithms
- System design and architecture
- Problem-solving methodology
- Code quality and best practices
- Performance optimization

Start naturally with your introduction and first question.`;

      const result = await generateContent({
        prompt: introPrompt,
        model: "gemini-2.5-flash",
        maxOutputTokens: 8192,
        temperature: 0.7,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to generate content");
      }

      const text =
        result.data || "I could not generate a response. Please try again.";

      const initialChatHistory = [
        { role: "user", parts: [{ text: introPrompt }] },
      ];

      const initialLog: LogEntry[] = [
        {
          speaker: "System" as const,
          text: `Starting technical interview simulation...`,
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
      setInterviewStartTime(Date.now());

      // Save interview session to storage
      saveInterviewSession({
        interviewType: "technical",
        interviewerName: "Dr. Sarah Chen",
        jobRole: jobDetails.role,
        company: jobDetails.company,
        chatLog: initialLog.map((entry) => ({
          speaker: entry.speaker,
          text: entry.text,
          timestamp: entry.timestamp,
        })),
        status: "in-progress",
      })
        .then((newSessionId) => {
          setCurrentSessionId(newSessionId);
        })
        .catch((error) => {
          console.error("Error saving interview session:", error);
        });

      // Speak the greeting using TTS
      speakText(text);

      // Remove the "Preparing audio..." message after playback begins
      setInterviewLog((prevLog) =>
        prevLog.filter((entry) => entry.text !== "Preparing audio...")
      );

      toast({
        title: "Technical Interview Started",
        description: "This is a Technical interview.",
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

      // Add user's thank you to log
      const userLogEntry: LogEntry = {
        speaker: "You",
        text: currentAnswer,
        timestamp: Date.now(),
      };
      setInterviewLog((prev) => [...prev, userLogEntry]);

      // Generate early feedback
      const updatedChatHistory = [
        ...chatHistory,
        { role: "user", parts: [{ text: currentAnswer }] },
      ];

      try {
        const feedbackPrompt = `The candidate has ended the interview early by saying "${currentAnswer}". Based on the technical interview conversation so far, provide constructive feedback on their performance.

Interview Type: Technical
Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Conversation:
${updatedChatHistory
  .map(
    (msg) =>
      `${msg.role === "user" ? "Candidate" : "Dr. Sarah Chen"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

As Dr. Sarah Chen, acknowledge their thanks professionally and provide feedback covering:
1. Technical knowledge demonstrated so far
2. Problem-solving approach
3. Communication of technical concepts
4. Areas that could have been explored further
5. Recommendations for continued learning`;

        const feedbackResult = await generateContent({
          prompt: feedbackPrompt,
          model: "gemini-2.5-flash",
          maxOutputTokens: 8192,
          temperature: 0.7,
        });

        if (feedbackResult.success) {
          const feedbackText =
            feedbackResult.data ||
            "Thank you for your time. Best of luck with your preparation!";

          const feedbackLogEntry: LogEntry = {
            speaker: "Feedback",
            text: feedbackText,
            timestamp: Date.now(),
          };
          setInterviewLog((prev) => [...prev, feedbackLogEntry]);
        }
      } catch (error) {
        console.error("Error generating early feedback:", error);
      }

      // Mark session as early-exit
      if (currentSessionId) {
        updateInterviewSession(currentSessionId, {
          status: "early-exit",
        });
      }

      setInterviewState("feedback");
      setLoading(false);
      toast({
        title: "Interview Ended",
        description: "Thank you for participating in this technical interview.",
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
        const feedbackPrompt = `As Dr. Sarah Chen, provide comprehensive feedback on the candidate's technical interview performance. Be thorough, constructive, and professional.

Interview Type: Technical
Job Role: ${jobDetails.role}
Company: ${jobDetails.company}

Complete Interview Conversation:
${updatedChatHistory
  .map(
    (msg, index) =>
      `${msg.role === "user" ? "Candidate" : "Dr. Sarah Chen"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

Provide detailed feedback as Dr. Sarah Chen covering:
1. Technical knowledge depth and breadth
2. Problem-solving methodology and analytical thinking
3. Understanding of system design principles
4. Code quality awareness and best practices
5. Communication clarity when explaining technical concepts
6. Areas of strength demonstrated
7. Specific areas for improvement with actionable advice
8. Overall assessment and recommendation`;

        const feedbackResult = await generateContent({
          prompt: feedbackPrompt,
          model: "gemini-2.5-flash",
          maxOutputTokens: 8192,
          temperature: 0.7,
        });

        if (!feedbackResult.success) {
          throw new Error(
            feedbackResult.error || "Failed to generate feedback"
          );
        }

        const feedbackText =
          feedbackResult.data || "Unable to generate feedback.";

        const feedbackLogEntry: LogEntry = {
          speaker: "Feedback",
          text: feedbackText,
          timestamp: Date.now(),
        };
        setInterviewLog((prev) => [...prev, feedbackLogEntry]);
        setInterviewState("feedback");

        toast({
          title: "Interview Complete",
          description: "Your technical interview session has concluded.",
        });
      } else {
        // Generate next question
        const nextQuestionPrompt = `You are Dr. Sarah Chen continuing this technical interview for the ${
          jobDetails.role
        } position at ${jobDetails.company}.

Your interviewing approach:
- Build upon previous answers to go deeper
- If the candidate struggled, adjust difficulty or explore adjacent topics
- If they excelled, challenge them with more complex scenarios
- Ask about real-world applications and trade-offs
- Focus on understanding over memorization
- Explore both theoretical knowledge and practical experience

Candidate's Resume:
${jobDetails.resumeText}

Previous conversation:
${updatedChatHistory
  .slice(0, -1)
  .map(
    (msg) =>
      `${msg.role === "user" ? "Candidate" : "Dr. Sarah Chen"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

Candidate's last answer: ${currentAnswer}

Based on their response, ask your next technical question. Focus areas:
- System design and architecture
- Algorithms and data structures
- Scalability and performance
- Security considerations
- Testing and debugging approaches
- Real-world problem-solving

Ask one focused, clear question:

Resume:
${jobDetails.resumeText}

Previous conversation:
${updatedChatHistory
  .slice(0, -1)
  .map(
    (msg, index) =>
      `${msg.role === "user" ? "Candidate" : "Interviewer"}: ${
        msg.parts[0].text
      }`
  )
  .join("\n")}

Candidate's last answer: ${currentAnswer}

Ask one focused question that builds on the conversation and assesses technical skills.`;

        const questionResult = await generateContent({
          prompt: nextQuestionPrompt,
          model: "gemini-2.5-flash",
          maxOutputTokens: 8192,
          temperature: 0.7,
        });

        if (!questionResult.success) {
          throw new Error(
            questionResult.error || "Failed to generate next question"
          );
        }

        const nextQuestion =
          questionResult.data || "What are your career goals?";

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
    // Reset local state (no backend call needed for standalone mode)

    setInterviewState("setup");
    setInterviewLog([]);
    setSessionId(null);
    setJobDetails({ role: "", company: "", resumeText: "" });
    setUserAnswer("");
    setChatHistory([]);
    setQuestionCount(0);
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const confirmBack = () => {
    // Save current session if in progress
    if (interviewState === "in-progress" && currentSessionId) {
      const duration = Math.floor((Date.now() - interviewStartTime) / 1000);
      updateInterviewSession(currentSessionId, {
        chatLog: interviewLog.map((log) => ({
          speaker: log.speaker,
          text: log.text,
          timestamp: log.timestamp,
        })),
        duration,
        status: "early-exit",
      }).catch((error) =>
        console.error("Error saving interview session:", error)
      );
    }
    if (onNavigate) {
      onNavigate("dashboard");
    } else {
      window.location.href = "/";
    }
  };

  const cancelBack = () => {
    setShowBackConfirm(false);
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
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleBackClick} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Technical Interview Setup
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Enter your details to begin your AI-powered technical interview
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
            placeholder="e.g., Software Engineer, Data Scientist"
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
            "Start Technical Interview"
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderInProgress = () => (
    <Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between mb-2">
          <Button
            onClick={handleBackClick}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Badge variant="secondary" className="text-sm">
            {interviewType}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Technical Interview Simulator
          </CardTitle>
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
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleBackClick} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Technical Interview Complete!
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Your technical interview session has concluded. Review the
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

        {/* Back Confirmation Modal */}
        {showBackConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Confirm Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {interviewState === "in-progress"
                    ? "Are you sure you want to go back? Your current interview progress will be saved, but you'll need to restart the interview from the beginning."
                    : "Are you sure you want to go back to the dashboard?"}
                </p>
                <div className="flex gap-4 justify-end">
                  <Button onClick={cancelBack} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={confirmBack}>Go Back</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalInterviewSimulator;
