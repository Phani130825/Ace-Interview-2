import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Clock,
} from "lucide-react";

type TranscriptEntry = {
  id: string;
  speaker: "candidate" | "interviewer";
  text: string;
  timestamp: Date;
  isInterim?: boolean;
};

type Props = {
  interviewId: string;
  interviewType?: "hr" | "managerial" | "technical";
  interviewerProfile?: {
    name: string;
    personaPrompt?: string;
    voice?: string;
  };
  initialPrompts?: string[];
  localLLM?: boolean;
  remoteLLMUrl?: string | null;
  remoteLLMHeaders?: Record<string, string>;
  onSessionEnd?: (summary: {
    transcript: TranscriptEntry[];
    score: number;
    strengths: string[];
    weaknesses: string[];
  }) => void;
  className?: string;
};

const InterviewSimulator: React.FC<Props> = ({
  interviewId,
  interviewType,
  interviewerProfile,
  initialPrompts = [],
  localLLM = true,
  remoteLLMUrl,
  remoteLLMHeaders,
  onSessionEnd,
  className = "",
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Audio/Video
  const [micEnabled, setMicEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // STT
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [isListening, setIsListening] = useState(false);

  // LLM Worker
  const workerRef = useRef<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // TTS
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Refs
  const transcriptRef = useRef<HTMLDivElement>(null);
  const interimTranscriptRef = useRef<string>("");

  // Session Ended State
  const [sessionEnded, setSessionEnded] = useState(false);

  // Error State
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const checkBrowserSupport = () => {
      const hasSTT =
        "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      const hasTTS = "speechSynthesis" in window;

      if (!hasSTT) {
        setErrorMessage(
          "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
        );
      }
      if (!hasTTS) {
        setErrorMessage((prev) =>
          prev
            ? `${prev} Text-to-speech is not supported in this browser.`
            : "Text-to-speech is not supported in this browser."
        );
      }
      if (!hasSTT && !hasTTS) {
        setErrorMessage(
          "Voice features are not supported in this browser. Please use a modern browser like Chrome or Edge."
        );
      }
    };

    checkBrowserSupport();

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = (event) => {
        console.error("STT Error:", event.error);
        let errorMsg = "";
        switch (event.error) {
          case "not-allowed":
            errorMsg =
              "Microphone permission denied. Please allow microphone access and refresh the page.";
            break;
          case "no-speech":
            errorMsg =
              "No speech detected. Please speak clearly into the microphone.";
            break;
          case "audio-capture":
            errorMsg =
              "No microphone found. Please connect a microphone and refresh the page.";
            break;
          case "network":
            errorMsg =
              "Network error during speech recognition. Please check your connection.";
            break;
          default:
            errorMsg = `Speech recognition error: ${event.error}`;
        }
        setErrorMessage(errorMsg);
      };

      recognitionInstance.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          addTranscriptEntry("candidate", finalTranscript, false);
          interimTranscriptRef.current = "";
          // Generate next interviewer question based on candidate's response
          if (isRecording && !isPaused) {
            generateInterviewerResponse(finalTranscript);
          }
        } else if (interimTranscript) {
          interimTranscriptRef.current = interimTranscript;
          // Update interim display
          setTranscript((prev) => {
            const newTranscript = [...prev];
            const lastEntry = newTranscript[newTranscript.length - 1];
            if (lastEntry && lastEntry.isInterim) {
              lastEntry.text = interimTranscript;
            } else {
              newTranscript.push({
                id: `interim-${Date.now()}`,
                speaker: "candidate",
                text: interimTranscript,
                timestamp: new Date(),
                isInterim: true,
              });
            }
            return newTranscript;
          });
        }
      };

      setRecognition(recognitionInstance);
    }

    // Initialize TTS
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        voicesRef.current = synthRef.current!.getVoices();
        if (voicesRef.current.length > 0 && !selectedVoice) {
          setSelectedVoice(voicesRef.current[0].name);
        }
      };
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Initialize LLM Worker
  useEffect(() => {
    if (localLLM) {
      workerRef.current = new Worker(
        new URL("./workers/llmWorker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      workerRef.current.onmessage = (event) => {
        const { type, token, error } = event.data;
        if (type === "done") {
          setWorkerReady(true);
          // Trigger TTS for the full interviewer response after streaming is done
          if (ttsEnabled && currentQuestion) {
            speakText(currentQuestion);
          }
        } else if (type === "token" && token) {
          // Handle streaming tokens for interviewer response
          setCurrentQuestion((prev) => prev + token);
        } else if (type === "error") {
          console.error("Worker error:", error);
        }
      };

      workerRef.current.postMessage({ type: "init" });

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
        }
      };
    }
  }, [localLLM]);

  // Timer
  useEffect(() => {
    if (sessionStartTime && !isPaused) {
      timerRef.current = setInterval(() => {
        const seconds = Math.floor(
          (Date.now() - sessionStartTime.getTime()) / 1000
        );
        setElapsedTime(seconds);
        if (seconds >= 1800 && isRecording) {
          endInterview();
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionStartTime, isPaused, isRecording]);

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      // Validate interviewId before making the API call
      if (
        !interviewId ||
        interviewId === "undefined" ||
        interviewId.length !== 24 ||
        !/^[0-9a-fA-F]{24}$/.test(interviewId)
      ) {
        console.warn(
          "Invalid interviewId, skipping questions fetch:",
          interviewId
        );
        setLoadingQuestions(false);
        setCurrentQuestion(
          "Invalid interview session. Please start a new interview."
        );
        return;
      }

      try {
        const response = await fetch(
          `/api/interviews/${interviewId}/questions`
        );
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.data.questions);
          setCurrentQuestion(
            data.data.questions[0]?.question ||
              "Tell me about yourself and why you're interested in this position."
          );
        } else if (response.status === 400) {
          const errorData = await response.json();
          console.error("Invalid interview ID:", errorData.error);
          setCurrentQuestion(
            "Invalid interview session. Please start a new interview."
          );
        }
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (interviewId) {
      fetchQuestions();
    }
  }, [interviewId]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const addTranscriptEntry = useCallback(
    (speaker: "candidate" | "interviewer", text: string, isInterim = false) => {
      const entry: TranscriptEntry = {
        id: `${speaker}-${Date.now()}-${Math.random()}`,
        speaker,
        text,
        timestamp: new Date(),
        isInterim,
      };
      setTranscript((prev) => [...prev.filter((e) => !e.isInterim), entry]);
    },
    []
  );

  const speakText = useCallback(
    async (text: string) => {
      if (!ttsEnabled || !synthRef.current) return;

      // Set speaking flag to prevent STT restart during TTS
      setIsSpeaking(true);

      // Pause STT while speaking to prevent feedback loops
      if (recognition && isListening) {
        recognition.stop();
      }

      // Ensure voices are loaded with retry mechanism
      const loadVoicesWithRetry = async (retries = 5, delay = 200) => {
        for (let i = 0; i < retries; i++) {
          voicesRef.current = synthRef.current.getVoices();
          if (voicesRef.current.length > 0) {
            if (!selectedVoice) {
              setSelectedVoice(voicesRef.current[0].name);
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      };
      await loadVoicesWithRetry();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voicesRef.current.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.rate = playbackRate;

      utterance.onend = () => {
        setIsSpeaking(false);
        // Resume STT after speaking
        if (recognition && micEnabled && isRecording && !isPaused) {
          try {
            recognition.start();
          } catch (error) {
            console.warn("Failed to restart recognition:", error);
          }
        }
      };

      utterance.onerror = (error) => {
        setIsSpeaking(false);
        console.error("TTS Error:", error);
        setErrorMessage(`Text-to-speech error: ${error}`);
        // Still try to resume STT
        if (recognition && micEnabled && isRecording && !isPaused) {
          try {
            recognition.start();
          } catch (error) {
            console.warn(
              "Failed to restart recognition after TTS error:",
              error
            );
          }
        }
      };

      synthRef.current.speak(utterance);
    },
    [
      ttsEnabled,
      selectedVoice,
      playbackRate,
      recognition,
      isListening,
      micEnabled,
      isRecording,
      isPaused,
    ]
  );

  const generateInterviewerResponse = useCallback(
    async (candidateResponse: string) => {
      setIsWaitingForResponse(true);
      setCurrentQuestion("");

      if (localLLM && workerReady && workerRef.current) {
        // Use local LLM worker
        const context = transcript.map((entry) => ({
          speaker: entry.speaker,
          text: entry.text,
          timestamp: entry.timestamp,
        }));
        workerRef.current.postMessage({
          type: "generate",
          data: {
            prompt: candidateResponse,
            context,
            interviewType: interviewType || "technical",
          },
        });

        // Wait for streaming to finish, then add interviewer response to transcript
        let interviewerResponse = "";
        const handleWorkerMessage = (event: MessageEvent) => {
          const { type, token, error } = event.data;
          if (type === "token" && token) {
            interviewerResponse += token;
            setCurrentQuestion((prev) => prev + token);
          } else if (type === "done") {
            addTranscriptEntry(
              "interviewer",
              interviewerResponse.trim(),
              false
            );
            setIsWaitingForResponse(false);
            if (workerRef.current) {
              workerRef.current.removeEventListener(
                "message",
                handleWorkerMessage
              );
            }
          } else if (type === "error") {
            console.error("Worker error during generation:", error);
            setErrorMessage(`LLM generation error: ${error}`);
            setCurrentQuestion("Thank you for your response. Let's continue.");
            speakText("Thank you for your response. Let's continue.");
            addTranscriptEntry(
              "interviewer",
              "Thank you for your response. Let's continue.",
              false
            );
            setIsWaitingForResponse(false);
            if (workerRef.current) {
              workerRef.current.removeEventListener(
                "message",
                handleWorkerMessage
              );
            }
          }
        };
        if (workerRef.current) {
          workerRef.current.addEventListener("message", handleWorkerMessage);
        }
      } else {
        // Use backend API for remote LLM
        try {
          const response = await fetch(
            `/api/interviews/${interviewId}/next-question`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userResponse: candidateResponse,
                conversationHistory: transcript.map((entry) => ({
                  speaker: entry.speaker,
                  text: entry.text,
                  timestamp: entry.timestamp,
                })),
                interviewType: interviewType || "technical",
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            setCurrentQuestion(data.data.question);
            speakText(data.data.question);
            addTranscriptEntry("interviewer", data.data.question, false);
          } else {
            console.error(
              "Failed to generate next question:",
              response.statusText
            );
            setCurrentQuestion("Thank you for your response. Let's continue.");
            speakText("Thank you for your response. Let's continue.");
            addTranscriptEntry(
              "interviewer",
              "Thank you for your response. Let's continue.",
              false
            );
          }
        } catch (error) {
          console.error("Error generating next question:", error);
          setCurrentQuestion("Thank you for your response. Let's continue.");
          speakText("Thank you for your response. Let's continue.");
          addTranscriptEntry(
            "interviewer",
            "Thank you for your response. Let's continue.",
            false
          );
        } finally {
          setIsWaitingForResponse(false);
        }
      }
    },
    [
      interviewId,
      transcript,
      interviewType,
      localLLM,
      workerReady,
      addTranscriptEntry,
      speakText,
    ]
  );

  const startInterview = useCallback(() => {
    setIsRecording(true);
    setSessionStartTime(new Date());
    setTranscript([]);
    setCurrentQuestion(
      initialPrompts[0] ||
        "Tell me about yourself and why you're interested in this position."
    );

    if (recognition && micEnabled) {
      recognition.start();
    }

    speakText("Interview starting. Please introduce yourself.");
  }, [recognition, micEnabled, initialPrompts, speakText]);

  const pauseInterview = useCallback(() => {
    setIsPaused(!isPaused);
    if (recognition) {
      if (isPaused) {
        recognition.start();
      } else {
        recognition.stop();
      }
    }
  }, [isPaused, recognition]);

  const endInterview = useCallback(async () => {
    setIsRecording(false);
    setIsPaused(false);
    setSessionEnded(true);
    if (recognition) recognition.stop();
    if (synthRef.current) synthRef.current.cancel();

    // Explicitly clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Generate feedback using LLM
    const feedbackPrompt = `Analyze this interview transcript and provide structured feedback with a score out of 100, strengths, and weaknesses: ${JSON.stringify(
      transcript
    )}`;

    let score = 75;
    let strengths: string[] = [
      "Good communication skills",
      "Relevant experience",
    ];
    let weaknesses: string[] = ["Could provide more specific examples"];

    if (localLLM && workerRef.current && workerReady) {
      // TODO: Implement feedback generation
    } else if (remoteLLMUrl) {
      try {
        const response = await fetch(remoteLLMUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...remoteLLMHeaders,
          },
          body: JSON.stringify({ prompt: feedbackPrompt }),
        });
        const data = await response.json();
        // Parse feedback from response
      } catch (error) {
        console.error("Feedback generation error:", error);
      }
    }

    // Submit to backend
    try {
      await fetch(`/api/interviews/${interviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          score,
          strengths,
          weaknesses,
          metadata: { duration: elapsedTime },
        }),
      });
    } catch (error) {
      console.error("Failed to submit session:", error);
    }

    if (onSessionEnd) {
      onSessionEnd({ transcript, score, strengths, weaknesses });
    }
  }, [
    recognition,
    transcript,
    interviewId,
    elapsedTime,
    onSessionEnd,
    localLLM,
    workerReady,
    remoteLLMUrl,
    remoteLLMHeaders,
  ]);

  const replayLastQuestion = useCallback(() => {
    if (currentQuestion) {
      speakText(currentQuestion);
    }
  }, [currentQuestion, speakText]);

  const exportTranscript = useCallback(() => {
    const content = transcript
      .filter((entry) => !entry.isInterim)
      .map(
        (entry) =>
          `[${entry.timestamp.toLocaleTimeString()}] ${entry.speaker.toUpperCase()}: ${
            entry.text
          }`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-${interviewId}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcript, interviewId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Interview Simulator</span>
              {interviewType && (
                <Badge variant="outline" className="capitalize">
                  {interviewType}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? (isPaused ? "PAUSED" : "RECORDING") : "STOPPED"}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(elapsedTime)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={startInterview}
              disabled={isRecording || sessionEnded}
              aria-label="Start Interview"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Interview
            </Button>
            <Button
              onClick={pauseInterview}
              disabled={!isRecording || sessionEnded}
              variant="outline"
              aria-label="Pause/Resume Interview"
            >
              {isPaused ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button
              onClick={endInterview}
              disabled={!isRecording || sessionEnded}
              variant="destructive"
              aria-label="End Interview"
            >
              <Square className="h-4 w-4 mr-2" />
              End Interview
            </Button>
            <Button
              onClick={replayLastQuestion}
              disabled={!currentQuestion || sessionEnded}
              variant="outline"
              aria-label="Replay Last Question"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Replay Question
            </Button>
            <Button
              onClick={exportTranscript}
              disabled={transcript.length === 0}
              variant="outline"
              aria-label="Export Transcript"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-100 text-red-800 rounded-md text-center mt-4 relative">
              {errorMessage}
              <button
                onClick={() => setErrorMessage("")}
                className="absolute top-2 right-2 text-red-800 hover:text-red-600"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          {/* Session Ended Message */}
          {sessionEnded && (
            <div className="p-4 bg-green-100 text-green-800 rounded-md text-center mt-4">
              Interview session has ended (30 minutes reached). Thank you for
              participating!
            </div>
          )}
          {/* Audio Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setMicEnabled(!micEnabled)}
              variant={micEnabled ? "default" : "outline"}
              aria-label={
                micEnabled ? "Disable Microphone" : "Enable Microphone"
              }
            >
              {micEnabled ? (
                <Mic className="h-4 w-4 mr-2" />
              ) : (
                <MicOff className="h-4 w-4 mr-2" />
              )}
              Mic {micEnabled ? "On" : "Off"}
            </Button>
            <Button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              variant={ttsEnabled ? "default" : "outline"}
              aria-label={
                ttsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"
              }
            >
              {ttsEnabled ? (
                <Volume2 className="h-4 w-4 mr-2" />
              ) : (
                <VolumeX className="h-4 w-4 mr-2" />
              )}
              TTS {ttsEnabled ? "On" : "Off"}
            </Button>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="px-3 py-2 border rounded-md"
              aria-label="Select Voice"
            >
              {voicesRef.current.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="w-24"
              aria-label="Playback Rate"
            />
            <span className="text-sm text-muted-foreground">
              {playbackRate}x
            </span>
          </div>
          {/* Current Question */}
          <Card>
            <CardHeader>
              <CardTitle>Current Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                {currentQuestion || "Waiting for interview to start..."}
              </p>
              {isWaitingForResponse && (
                <div className="mt-2">
                  <Progress value={undefined} className="animate-pulse" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Generating response...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={transcriptRef}
                className="h-96 overflow-y-auto space-y-4 p-4 border rounded-md"
                aria-live="polite"
                aria-label="Interview Transcript"
              >
                {transcript
                  .filter((entry) => !entry.isInterim)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex ${
                        entry.speaker === "candidate"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          entry.speaker === "candidate"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {entry.speaker === "candidate"
                            ? "You"
                            : "Interviewer"}{" "}
                          • {entry.timestamp.toLocaleTimeString()}
                        </div>
                        <p>{entry.text}</p>
                      </div>
                    </div>
                  ))}
                {interimTranscriptRef.current && (
                  <div className="flex justify-end">
                    <div className="max-w-[70%] p-3 rounded-lg bg-blue-50 text-blue-700 opacity-70">
                      <div className="text-xs text-muted-foreground mb-1">
                        You • Live
                      </div>
                      <p>{interimTranscriptRef.current}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewSimulator;
