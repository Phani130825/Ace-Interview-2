import React, { useState, useEffect } from "react";
import { saveAptitudeTest } from "@/services/testStorage";
import { generateContent } from "@/services/geminiService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/* ============================
   HELPER: CLEAN JSON
============================ */
function cleanGeminiJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find the first [ and last ] to extract just the JSON array
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  return cleaned;
}

/* ============================
   TYPES
============================ */
interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

/* ============================
   COMPONENT
============================ */
const Aptitude = () => {
  const [stage, setStage] = useState<
    "initial" | "loading" | "questions" | "results" | "error"
  >("initial");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [showBackConfirm, setShowBackConfirm] = useState<boolean>(false);

  /* ============================
     FETCH QUESTIONS
  ============================ */
  const fetchQuestions = async () => {
    setStage("loading");
    setErrorMessage("");

    /* ============================
       1️⃣ TRY BACKEND (OPENAI)
    ============================ */
    try {
      const backendResponse = await fetch(
        `${BACKEND_URL}/api/aptitude/generate-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (backendResponse.ok) {
        const backendResult = await backendResponse.json();
        if (backendResult.success && backendResult.questions) {
          setQuestions(backendResult.questions);
          setStage("questions");
          return;
        }
      } else {
        const errorData = await backendResponse.json();
        console.warn("Backend failed:", errorData);
      }
    } catch (backendError) {
      console.warn("Backend failed, falling back to Gemini", backendError);
    }

    /* ============================
       2️⃣ GEMINI FALLBACK (backend proxy)
    ============================ */
    const promptText = `
Generate exactly 25 aptitude multiple-choice questions.

Return ONLY valid JSON in this exact format:
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "one of the options"
  }
]

Rules:
- Exactly 4 options per question
- correctAnswer must match one option exactly
- No explanations
- No markdown
- No extra text
`;

    try {
      const result = await generateContent({
        prompt: promptText,
        model: "gemini-2.5-flash",
        maxOutputTokens: 4096,
        temperature: 0.7,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to generate questions");
      }

      const text = result.data;

      if (!text) {
        throw new Error("Invalid response");
      }

      // Clean the response before parsing
      const cleanedText = cleanGeminiJSON(text);
      const fetchedQuestions: Question[] = JSON.parse(cleanedText);

      if (!Array.isArray(fetchedQuestions) || fetchedQuestions.length === 0) {
        throw new Error("No questions generated");
      }

      setQuestions(fetchedQuestions);
      setStage("questions");
      setStartTime(Date.now()); // Start timer when questions are displayed
    } catch (error) {
      console.error("Gemini failed:", error);
      setErrorMessage("Failed to fetch questions. Please try again.");
      setStage("error");
    }
  };

  /* ============================
     ANSWER HANDLERS
  ============================ */
  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = async () => {
    const timeTaken =
      startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
    let calculatedScore = 0;

    // Build detailed question results
    const questionResults = questions.map((q, idx) => {
      const userAnswer = answers[idx] || "";
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) calculatedScore++;

      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer,
        isCorrect,
      };
    });

    const percentage = (calculatedScore / questions.length) * 100;

    // Save to MongoDB and local storage
    try {
      console.log(
        "Saving aptitude test with",
        questionResults.length,
        "questions..."
      );
      const savedId = await saveAptitudeTest({
        questions: questionResults,
        score: calculatedScore,
        totalQuestions: questions.length,
        percentage,
        timeTaken,
      });
      console.log("Aptitude test saved successfully with ID:", savedId);
    } catch (error) {
      console.error("Error saving aptitude test:", error);
      alert(
        "Note: Test results may not be saved. Please check your connection."
      );
    }

    setScore(calculatedScore);
    setStage("results");

    import("@/lib/pipeline").then(({ updateStage }) => {
      updateStage("aptitude");
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setScore(0);
    setStage("initial");
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const confirmBack = () => {
    // Navigate back to dashboard
    window.location.href = "/";
  };

  const cancelBack = () => {
    setShowBackConfirm(false);
  };

  /* ============================
     UI
  ============================ */
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div className="w-32"></div>
        </div>
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-700">
            General Aptitude Test
          </h1>
          <p className="mt-2 text-gray-600">
            Test your logical and quantitative skills with 25 dynamic questions.
          </p>
        </header>

        {stage === "initial" && (
          <div className="flex flex-col items-center">
            <button
              onClick={fetchQuestions}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Start Test
            </button>
          </div>
        )}

        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-500 font-medium">
              Generating your questions...
            </p>
          </div>
        )}

        {stage === "questions" && (
          <>
            <form>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-lg shadow-md mb-6"
                >
                  <p className="text-lg font-semibold mb-4 text-gray-800">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name={"question-" + idx}
                          value={option}
                          checked={answers[idx] === option}
                          onChange={() => handleAnswerChange(idx, option)}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
                disabled={Object.keys(answers).length !== questions.length}
              >
                Submit Answers
              </button>
            </div>
          </>
        )}

        {stage === "results" && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Results</h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {questions.map((q, idx) => {
                const isCorrect = answers[idx] === q.correctAnswer;
                const yourAnswer = answers[idx] || "No answer";

                return (
                  <div
                    key={idx}
                    className={
                      "p-4 rounded-lg border-2 " +
                      (isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200")
                    }
                  >
                    <p
                      className={
                        "font-bold " +
                        (isCorrect ? "text-green-700" : "text-red-700")
                      }
                    >
                      {idx + 1}. {q.question}
                    </p>
                    <p className="text-sm mt-2">
                      {isCorrect ? (
                        <span className="text-green-600">Correct!</span>
                      ) : (
                        <span className="text-red-600">Incorrect.</span>
                      )}{" "}
                      Your answer: {yourAnswer}. The correct answer was:{" "}
                      <strong>{q.correctAnswer}</strong>
                    </p>
                  </div>
                );
              })}
            </div>

            <h2 className="text-3xl font-bold my-6">
              You scored {score} out of {questions.length}!
            </h2>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRetry}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                Try Again
              </button>

              <button
                onClick={handleBackClick}
                className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="text-center text-red-600 bg-red-100 rounded-lg p-4 mt-4">
            <p>{errorMessage}</p>
            <button
              onClick={fetchQuestions}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Back Confirmation Modal */}
        {showBackConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Navigation
              </h3>
              <p className="text-gray-600 mb-6">
                {stage === "questions"
                  ? "Are you sure you want to go back? Your progress will be lost and the test will not be saved."
                  : "Are you sure you want to go back to the dashboard?"}
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={cancelBack}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBack}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Aptitude;
