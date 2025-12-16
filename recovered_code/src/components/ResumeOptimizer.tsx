import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, Download, Sparkles, FileText, Eye } from "lucide-react";
import jsPDF from "jspdf";
import { generateContent } from "@/services/geminiService";

const ResumeOptimizer = () => {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [optimizedText, setOptimizedText] = useState<string>(
    "Your optimized resume content will appear here after processing."
  );
  const [critiqueText, setCritiqueText] = useState<string>(
    'Click "✨ Get Resume Critique" to see how well your current resume matches the job description.'
  );
  const [coverLetterText, setCoverLetterText] = useState<string>(
    'Click "✨ Draft Cover Letter" once you have optimized your resume.'
  );
  const [activeTab, setActiveTab] = useState<string>("optimize");

  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isDraftingLetter, setIsDraftingLetter] = useState<boolean>(false);
  const [coverLetterDisabled, setCoverLetterDisabled] = useState<boolean>(true);
  const [downloadDisabled, setDownloadDisabled] = useState<boolean>(true);

  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);

  // Initialize with example data
  useEffect(() => {
    setResumeText(`John Doe
(555) 123-4567 | john.doe@email.com | LinkedIn Profile

Summary
A highly motivated software developer with 3 years of experience in JavaScript and Python, specializing in web application development. Delivered two major projects utilizing React.js and a Django backend. Seeking a challenging role to leverage my technical skills.

Experience:
Software Developer | TechCorp | 2021-Present
- Developed and maintained critical internal tools using Python and SQL.
- Collaborated with a team of 5 engineers to deliver features on time.

Skills: JavaScript, Python, React, Django, SQL.`);

    setJobDescription(`Senior Software Engineer - React & Node.js
We are looking for a highly motivated Senior Software Engineer with 5+ years of experience. Must have deep expertise in modern React frameworks, server-side Node.js development, and cloud deployment (AWS/Azure). Strong emphasis on performance optimization and scalable API design is required. Experience with CI/CD pipelines is a plus. Needs strong communication skills.`);
  }, []);

  const showMessage = (msg: string, error: boolean = false) => {
    setMessage(msg);
    setIsError(error);
  };

  const callApi = async (promptText: string, maxRetries: number = 3) => {
    // Call backend proxy which handles user API key vs app API key automatically
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await generateContent({
          prompt: promptText,
          model: "gemini-2.5-flash",
          maxOutputTokens: 8192,
          temperature: 0.7,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to generate content");
        }

        console.log("✓ API call succeeded via backend proxy");
        // Return in format expected by existing code
        return {
          candidates: [{ content: { parts: [{ text: result.data }] } }],
        };
      } catch (error) {
        console.error(
          `Attempt ${attempt + 1} failed:`,
          (error as Error).message
        );
        if (attempt === maxRetries - 1) {
          throw error;
        }
        // Exponential backoff
        const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.warn(`Retrying in ${Math.floor(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const handleCritique = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      showMessage(
        "Please provide both your resume text and the job description.",
        true
      );
      return;
    }

    setIsCritiquing(true);
    setMessage("");
    setCritiqueText("Analyzing match and generating critique...");
    setActiveTab("critique");

    try {
      const systemPrompt =
        "You are a Resume Match Critic AI. Your role is to provide a candid, constructive, and highly detailed critique of the candidate's ORIGINAL resume against the target job description. Your response must follow this structure:\n\n1. SCORE: Provide a match score out of 100. Bold this score.\n2. STRENGTHS: List 3-5 key areas where the resume aligns well with the JD.\n3. GAPS & MISMATCHES: List 3-5 specific areas (keywords, experience, soft skills) that are present in the JD but missing or weak in the resume.\n4. SUGGESTIONS: Offer actionable bulleted advice on how to tailor the resume before optimization.";

      const userQuery = `Original Resume to Critique:\n\n---\n${resumeText}\n---\n\nTarget Job Description:\n\n---\n${jobDescription}\n---`;

      const combinedPrompt = `${systemPrompt}\n\n${userQuery}`;

      const result = await callApi(combinedPrompt);
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setCritiqueText(generatedText.trim());
        showMessage("Critique generated. Check the 'AI Critique' tab!", false);
      } else {
        throw new Error(
          "Critique failed: Could not get valid content from the AI."
        );
      }
    } catch (error) {
      console.error("Critique Error:", error);
      showMessage(
        `Critique failed: ${
          (error as Error).message
        }. Please check your input and try again.`,
        true
      );
      setCritiqueText("Error: Failed to generate resume critique.");
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleOptimization = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      showMessage(
        "Please provide both your resume text and the job description.",
        true
      );
      return;
    }

    setIsOptimizing(true);
    setMessage("");
    setOptimizedText("Analyzing and optimizing...");
    setCoverLetterDisabled(true);
    setDownloadDisabled(true);
    setActiveTab("optimize");

    try {
      const systemPrompt =
        "You are a Resume Optimization AI. Your task is to act as a professional career coach. You MUST analyze the candidate's resume text and rewrite/tailor it to maximize keyword match and relevance to the provided job description. CRITICALLY, you MUST identify the candidate's full name from the input resume and place it as the FIRST LINE of your output, followed by two blank lines. Do not include any conversational text, markdown headers (like #), or instructional comments in the final output.";

      const userQuery = `Original Resume:\n\n---\n${resumeText}\n---\n\nJob Description:\n\n---\n${jobDescription}\n---`;

      const combinedPrompt = `${systemPrompt}\n\n${userQuery}`;

      const result = await callApi(combinedPrompt);
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        const optimizedContent = generatedText.trim();
        setOptimizedText(optimizedContent);
        showMessage(
          "Resume optimized successfully! You can now draft a cover letter or download the PDF.",
          false
        );
        setCoverLetterDisabled(false);
        setDownloadDisabled(false);
      } else {
        throw new Error(
          "Optimization failed: Could not get valid content from the AI."
        );
      }
    } catch (error) {
      console.error("Optimization Error:", error);
      showMessage(
        `Optimization failed: ${
          (error as Error).message
        }. Please check your input and try again.`,
        true
      );
      setOptimizedText("Error: Failed to generate optimized resume.");
      setCoverLetterDisabled(true);
      setDownloadDisabled(true);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCoverLetter = async () => {
    if (
      !optimizedText ||
      optimizedText === "Analyzing and optimizing..." ||
      optimizedText.startsWith("Error:")
    ) {
      showMessage(
        "Please optimize your resume first. The cover letter uses the optimized content.",
        true
      );
      return;
    }
    if (!jobDescription.trim()) {
      showMessage("Please ensure the job description is pasted.", true);
      return;
    }

    setIsDraftingLetter(true);
    setMessage("");
    setCoverLetterText("Drafting a tailored cover letter...");
    setActiveTab("cover-letter");

    try {
      const systemPrompt =
        "You are a professional HR specialist. Draft a formal cover letter (no contact information, just placeholders like [Date], [Hiring Manager Name], and [Your Name]) that references the candidate's skills (provided in the 'Optimized Resume' text) and directly links them to the requirements in the 'Job Description'. The tone should be enthusiastic and professional.";

      const userQuery = `Optimized Resume (Source Content):\n\n---\n${optimizedText}\n---\n\nTarget Job Description:\n\n---\n${jobDescription}\n---`;

      const combinedPrompt = `${systemPrompt}\n\n${userQuery}`;

      const result = await callApi(combinedPrompt);
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setCoverLetterText(generatedText.trim());
        showMessage(
          "Cover letter draft complete. Review the 'Cover Letter Draft' tab!",
          false
        );
      } else {
        throw new Error(
          "Cover letter drafting failed: Could not get valid content from the AI."
        );
      }
    } catch (error) {
      console.error("Cover Letter Error:", error);
      showMessage(
        `Cover Letter drafting failed: ${(error as Error).message}.`,
        true
      );
      setCoverLetterText("Error: Failed to draft cover letter.");
    } finally {
      setIsDraftingLetter(false);
    }
  };

  const generatePDF = () => {
    if (
      !optimizedText ||
      optimizedText === "Analyzing and optimizing..." ||
      optimizedText.startsWith("Error:")
    ) {
      showMessage(
        "Please optimize the resume first before attempting to download.",
        true
      );
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    const lines = optimizedText.split("\n");
    const name = lines[0].trim();
    const bodyContent = lines.slice(1).join("\n").trim();

    const margin = 20;
    let y = margin;
    const lineHeight = 5;
    const headerLineHeight = 10;
    const contentWidth = doc.internal.pageSize.getWidth() - 2 * margin;

    // Candidate Name (Large, Bold, Centered)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(24);
    doc.text(name, doc.internal.pageSize.getWidth() / 2, y, {
      align: "center",
    });
    y += headerLineHeight * 2;

    // Optimized Resume Body
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);

    const splitText = doc.splitTextToSize(bodyContent, contentWidth);

    for (let i = 0; i < splitText.length; i++) {
      if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(splitText[i], margin, y);
      y += lineHeight;
    }

    // Determine filename
    let filename = "Optimized_Resume.pdf";
    if (name) {
      const sanitizedName = name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .substring(0, 30);
      filename = `${sanitizedName}_Optimized_Resume.pdf`;
    }

    doc.save(filename);
    showMessage("Optimized resume PDF generated!", false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-indigo-700">
            AI Resume Suite
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Critique, optimize, and draft letters instantly using the power of
            AI.
          </p>
        </header>

        <main className="grid lg:grid-cols-3 gap-6">
          {/* Input Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <label
                htmlFor="resumeInput"
                className="block text-lg font-semibold text-gray-800 mb-2"
              >
                Your Current Resume Text
              </label>
              <Textarea
                id="resumeInput"
                rows={12}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                placeholder="Paste your full resume text here. The AI will extract your name!"
              />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <label
                htmlFor="jdInput"
                className="block text-lg font-semibold text-gray-800 mb-2"
              >
                Target Job Description (JD)
              </label>
              <Textarea
                id="jdInput"
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                placeholder="Paste the job description you are applying for."
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCritique}
                disabled={isCritiquing}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-lg font-medium rounded-xl shadow-md text-indigo-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCritiquing && (
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-700" />
                )}
                <Sparkles className="h-5 w-5 mr-2" />
                Get Resume Critique
              </Button>

              <Button
                onClick={handleOptimization}
                disabled={isOptimizing}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-lg font-medium rounded-xl shadow-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOptimizing && (
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                )}
                Optimize Resume
              </Button>

              <Button
                onClick={handleCoverLetter}
                disabled={coverLetterDisabled || isDraftingLetter}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-lg font-medium rounded-xl shadow-md text-indigo-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDraftingLetter && (
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" />
                )}
                <Sparkles className="h-5 w-5 mr-2" />
                Draft Cover Letter
              </Button>

              <Button
                onClick={generatePDF}
                disabled={downloadDisabled}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-lg font-medium rounded-xl shadow-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Optimized Resume (PDF)
              </Button>

              {message && (
                <Alert
                  className={`mt-2 p-3 rounded-lg ${
                    isError
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "bg-green-50 border-green-300 text-green-600"
                  }`}
                >
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Output Column (Tabbed) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-2xl border border-indigo-300">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="optimize" className="font-semibold">
                  Optimized Resume
                </TabsTrigger>
                <TabsTrigger value="critique" className="font-semibold">
                  AI Critique
                </TabsTrigger>
                <TabsTrigger value="cover-letter" className="font-semibold">
                  Cover Letter Draft
                </TabsTrigger>
              </TabsList>

              <TabsContent value="optimize" className="mt-0">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Tailored Content Ready for Submission
                </h2>
                <div className="min-h-[300px] bg-gray-50 p-4 border border-dashed border-gray-300 rounded-lg whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                  {optimizedText}
                </div>
              </TabsContent>

              <TabsContent value="critique" className="mt-0">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Original Resume Analysis
                </h2>
                <div className="min-h-[300px] bg-red-50 p-4 border border-dashed border-red-300 rounded-lg whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                  {critiqueText}
                </div>
              </TabsContent>

              <TabsContent value="cover-letter" className="mt-0">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  AI-Drafted Cover Letter
                </h2>
                <div className="min-h-[300px] bg-blue-50 p-4 border border-dashed border-blue-300 rounded-lg whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                  {coverLetterText}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResumeOptimizer;
