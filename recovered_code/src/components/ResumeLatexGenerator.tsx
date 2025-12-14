import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Sparkles,
  Loader,
  AlertCircle,
  CheckCircle,
  Code,
  Eye,
} from "lucide-react";
import api from "@/services/api";

const ResumeLatexGenerator = () => {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [latexContent, setLatexContent] = useState<string>("");
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isGeneratingLatex, setIsGeneratingLatex] = useState<boolean>(false);
  const [isCompilingPdf, setIsCompilingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const generateLatex = async () => {
    if (!resumeText.trim()) {
      setError("Please enter your resume text");
      return;
    }

    setIsGeneratingLatex(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/resumes/optimize-latex", {
        resumeText: resumeText.trim(),
        jobDescription: jobDescription.trim() || "General professional role",
      });

      const latex = response.data?.data?.latex || "";
      if (latex) {
        setLatexContent(latex);
        setSuccess("LaTeX generated successfully!");
      } else {
        setError("Failed to generate LaTeX content");
      }
    } catch (err: any) {
      console.error("LaTeX generation failed:", err);
      setError(err.response?.data?.error || "Failed to generate LaTeX");
    } finally {
      setIsGeneratingLatex(false);
    }
  };

  const compilePdf = async () => {
    if (!latexContent.trim()) {
      setError("No LaTeX content to compile");
      return;
    }

    setIsCompilingPdf(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/resumes/compile-latex", {
        latexContent: latexContent.trim(),
      });

      const base64Pdf = response.data?.data?.base64Pdf || "";
      if (base64Pdf) {
        setPdfData(base64Pdf);
        setSuccess("PDF compiled successfully!");
      } else {
        setError("Failed to compile PDF");
      }
    } catch (err: any) {
      console.error("PDF compilation failed:", err);
      setError(err.response?.data?.error || "Failed to compile PDF");
    } finally {
      setIsCompilingPdf(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfData) return;

    try {
      // Convert base64 to blob
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Failed to download PDF");
    }
  };

  const downloadLatex = () => {
    if (!latexContent) return;

    try {
      const blob = new Blob([latexContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${Date.now()}.tex`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("LaTeX download failed:", err);
      setError("Failed to download LaTeX file");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resume LaTeX Generator
          </h1>
          <p className="text-gray-600">
            Generate professional LaTeX resumes using AI and compile them to PDF
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Resume Text Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Resume Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Paste your resume text here...&#10;&#10;Example:&#10;John Doe&#10;Software Engineer&#10;&#10;Experience:&#10;- Senior Developer at Tech Corp (2020-Present)&#10;  - Led development of web applications&#10;  - Managed team of 5 developers&#10;&#10;Skills: JavaScript, React, Node.js"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <div className="mt-4 text-sm text-gray-500">
                  Enter your complete resume text. The AI will optimize it and
                  generate professional LaTeX code.
                </div>
              </CardContent>
            </Card>

            {/* Job Description (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-primary" />
                  Job Description (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Paste the job description here for better optimization..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <div className="mt-4 text-sm text-gray-500">
                  Providing a job description helps the AI tailor your resume
                  with relevant keywords and achievements.
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={generateLatex}
                  disabled={isGeneratingLatex || !resumeText.trim()}
                >
                  {isGeneratingLatex ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Generating LaTeX...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate LaTeX with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Status Messages */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}
          </div>

          {/* Right Column - Output */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-brand-primary" />
                    LaTeX & PDF Preview
                  </span>
                  {latexContent && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadLatex}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        .tex
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={compilePdf}
                        disabled={isCompilingPdf}
                      >
                        {isCompilingPdf ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      {pdfData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadPdf}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="latex" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="latex">LaTeX Code</TabsTrigger>
                    <TabsTrigger value="pdf" disabled={!pdfData}>
                      PDF Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="latex" className="mt-6">
                    <div className="bg-gray-900 rounded-xl p-6 min-h-[500px]">
                      {latexContent ? (
                        <textarea
                          className="w-full h-96 bg-transparent text-green-400 font-mono text-sm focus:outline-none resize-none"
                          value={latexContent}
                          onChange={(e) => setLatexContent(e.target.value)}
                          spellCheck={false}
                          placeholder="LaTeX code will appear here..."
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                          <Code className="h-16 w-16 mb-4" />
                          <p className="text-lg mb-2">No LaTeX generated yet</p>
                          <p className="text-sm text-center">
                            Enter your resume text and click "Generate LaTeX
                            with AI"
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="pdf" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-gray-200 min-h-[500px]">
                      {pdfData ? (
                        <iframe
                          src={`data:application/pdf;base64,${pdfData}`}
                          className="w-full h-96 rounded-lg"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                          <FileText className="h-16 w-16 mb-4" />
                          <p className="text-lg mb-2">No PDF compiled yet</p>
                          <p className="text-sm text-center">
                            Generate LaTeX first, then compile to PDF
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Input Resume</h3>
                <p className="text-sm text-gray-600">
                  Paste your resume text and optionally provide a job
                  description for better optimization.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">AI Generation</h3>
                <p className="text-sm text-gray-600">
                  Our AI analyzes your resume and generates professional LaTeX
                  code optimized for ATS systems.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Compile & Download</h3>
                <p className="text-sm text-gray-600">
                  Compile the LaTeX to PDF directly in the app and download your
                  professional resume.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResumeLatexGenerator;
