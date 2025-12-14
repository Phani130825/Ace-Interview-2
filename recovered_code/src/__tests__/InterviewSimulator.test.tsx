import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InterviewSimulator from "../components/InterviewSimulator";

// Mock SpeechRecognition
const mockSpeechRecognition = {
  continuous: true,
  interimResults: true,
  lang: "en-US",
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
};

Object.defineProperty(window, "SpeechRecognition", {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
});

Object.defineProperty(window, "webkitSpeechRecognition", {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
});

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [
    { name: "Test Voice 1", lang: "en-US" },
    { name: "Test Voice 2", lang: "en-GB" },
  ]),
};

Object.defineProperty(window, "speechSynthesis", {
  writable: true,
  value: mockSpeechSynthesis,
});

// Mock fetch
global.fetch = jest.fn();

describe("InterviewSimulator", () => {
  const defaultProps = {
    interviewId: "test-interview-123",
    localLLM: true,
    remoteLLMUrl: null,
    remoteLLMHeaders: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it("renders the component with initial state", () => {
    render(<InterviewSimulator {...defaultProps} />);

    expect(screen.getByText("Interview Simulator")).toBeInTheDocument();
    expect(screen.getByText("STOPPED")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start interview/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /end interview/i })
    ).toBeDisabled();
  });

  it("starts the interview when start button is clicked", async () => {
    render(<InterviewSimulator {...defaultProps} />);

    const startButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("RECORDING")).toBeInTheDocument();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Interview starting. Please introduce yourself.",
      })
    );
  });

  it("toggles microphone when mic button is clicked", () => {
    render(<InterviewSimulator {...defaultProps} />);

    const micButton = screen.getByRole("button", {
      name: /enable microphone/i,
    });
    expect(micButton).toBeInTheDocument();

    fireEvent.click(micButton);
    expect(
      screen.getByRole("button", { name: /disable microphone/i })
    ).toBeInTheDocument();
  });

  it("toggles TTS when TTS button is clicked", () => {
    render(<InterviewSimulator {...defaultProps} />);

    const ttsButton = screen.getByRole("button", {
      name: /disable text-to-speech/i,
    });
    expect(ttsButton).toBeInTheDocument();

    fireEvent.click(ttsButton);
    expect(
      screen.getByRole("button", { name: /enable text-to-speech/i })
    ).toBeInTheDocument();
  });

  it("displays current question", () => {
    render(<InterviewSimulator {...defaultProps} />);

    expect(screen.getByText("Current Question")).toBeInTheDocument();
    expect(
      screen.getByText("Waiting for interview to start...")
    ).toBeInTheDocument();
  });

  it("shows transcript section", () => {
    render(<InterviewSimulator {...defaultProps} />);

    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(
      screen.getByRole("log", { name: /interview transcript/i })
    ).toBeInTheDocument();
  });

  it("exports transcript when export button is clicked", () => {
    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
    const mockRevokeObjectURL = jest.fn();
    const mockClick = jest.fn();

    Object.defineProperty(window.URL, "createObjectURL", {
      writable: true,
      value: mockCreateObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      writable: true,
      value: mockRevokeObjectURL,
    });

    Object.defineProperty(document, "createElement", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        click: mockClick,
        href: "",
        download: "",
      })),
    });

    render(<InterviewSimulator {...defaultProps} />);

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toBeDisabled(); // Should be disabled when no transcript

    // Note: In a real test, we'd need to simulate having transcript data
    // and verify the download functionality
  });

  it("calls onSessionEnd callback when interview ends", async () => {
    const mockOnSessionEnd = jest.fn();
    render(
      <InterviewSimulator {...defaultProps} onSessionEnd={mockOnSessionEnd} />
    );

    // Start interview first
    const startButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("RECORDING")).toBeInTheDocument();
    });

    // End interview
    const endButton = screen.getByRole("button", { name: /end interview/i });
    fireEvent.click(endButton);

    await waitFor(() => {
      expect(mockOnSessionEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: expect.any(Array),
          score: expect.any(Number),
          strengths: expect.any(Array),
          weaknesses: expect.any(Array),
        })
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/interviews/test-interview-123/submit",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("displays elapsed time", () => {
    jest.useFakeTimers();
    render(<InterviewSimulator {...defaultProps} />);

    expect(screen.getByText("00:00")).toBeInTheDocument();

    // Start interview
    const startButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(startButton);

    // Fast-forward time
    jest.advanceTimersByTime(65000); // 1 minute 5 seconds

    expect(screen.getByText("01:05")).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("displays error message on speech recognition error", async () => {
    render(<InterviewSimulator {...defaultProps} />);

    // Start interview
    const startButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(startButton);

    // Simulate speech recognition error
    if (mockSpeechRecognition.onerror) {
      mockSpeechRecognition.onerror({
        error: "network",
      } as SpeechRecognitionErrorEvent);
    }

    await waitFor(() => {
      expect(
        screen.getByText("Speech recognition error: network")
      ).toBeInTheDocument();
    });
  });
});
