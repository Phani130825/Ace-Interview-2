import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Download,
  Eye,
  Sparkles,
  Crown,
  CheckCircle,
  Plus,
  ArrowRight,
  Loader,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api, { resumeAPI } from "@/services/api";
import pipelineLib from "@/lib/pipeline";
import { useAuth } from "@/contexts/AuthContext";

type ResumeTailoringProps = {
  resumeId?: string;
  onStartInterview?: (interviewId?: string) => void;
};

const ResumeTailoring = ({
  resumeId,
  onStartInterview,
}: ResumeTailoringProps) => {
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [tailoredVersions, setTailoredVersions] = useState<any[]>([]);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [jobDescriptionSubmitted, setJobDescriptionSubmitted] =
    useState<boolean>(false);
  const [improvementsMade, setImprovementsMade] = useState(false);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isTailoring, setIsTailoring] = useState<boolean>(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] =
    useState<boolean>(false);
  const [resumeText, setResumeText] = useState<string>("");
  const [latexContent, setLatexContent] = useState<string>("");
  const [isGeneratingLatex, setIsGeneratingLatex] = useState<boolean>(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isCompilingPdf, setIsCompilingPdf] = useState<boolean>(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [optimizedText, setOptimizedText] = useState<string>("");

  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("original");
  const currentPipeline = pipelineLib.getCurrentPipeline();

  const formatParsedData = (pd: any, originalText?: string) => {
    if (originalText) return originalText;
    if (!pd) return "";
    if (typeof pd === "string") return pd;

    // Prioritize fullText if available (contains the complete original resume text)
    if (pd.fullText && pd.fullText.trim()) {
      return pd.fullText;
    }

    // Fallback to reconstructing from parsed data parts
    const parts: string[] = [];
    if (pd.personalInfo) {
      const p = pd.personalInfo;
      if (p.name) parts.push(p.name);
      if (p.email) parts.push(p.email);
      if (p.phone) parts.push(p.phone);
    }
    if (pd.summary) parts.push("\n" + pd.summary);
    if (pd.experience && Array.isArray(pd.experience) && pd.experience.length) {
      parts.push("\nExperience:");
      pd.experience.forEach((exp: any) => {
        parts.push(
          `- ${exp.title || ""} at ${exp.company || ""} ${
            exp.startDate
              ? "(" + new Date(exp.startDate).getFullYear() + ")"
              : ""
          }`
        );
        if (exp.description && Array.isArray(exp.description))
          parts.push("  " + exp.description.join("\n  "));
      });
    }
    if (pd.skills) {
      const tech = pd.skills.technical || pd.skills;
      if (tech && tech.length)
        parts.push(
          "\nSkills:\n" + (Array.isArray(tech) ? tech.join(", ") : tech)
        );
    }
    return parts.join("\n");
  };

  const improvements = [
    {
      type: "Skills Enhancement",
      description: "Added 5 relevant keywords from job description",
      impact: "high",
      applied: true,
    },
    {
      type: "Experience Optimization",
      description: "Reworded achievements to match job requirements",
      impact: "high",
      applied: true,
    },
    {
      type: "Summary Refinement",
      description: "Enhanced professional summary with target role focus",
      impact: "medium",
      applied: false,
    },
    {
      type: "Format Enhancement",
      description: "Improved ATS readability and structure",
      impact: "medium",
      applied: true,
    },
  ];

  const applyImprovement = (index: number) => {
    setImprovementsMade(true);
    // In real app, this would apply the improvement
  };

  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    let mounted = true;

    const loadOnce = async () => {
      try {
        const res = await api.get(`/resumes/${resumeId}`, {
          params: { _ts: Date.now() },
        });
        const r = res?.data?.data?.resume;
        console.log("Frontend received resume data:", {
          hasOriginalText: !!r?.originalText,
          originalTextLength: r?.originalText?.length || 0,
          hasParsedData: !!r?.parsedData,
          parsedDataFullTextLength: r?.parsedData?.fullText?.length || 0,
          originalTextFirst100: r?.originalText?.substring(0, 100) || "N/A",
        });
        if (r && mounted) {
          setParsedData(r.parsedData || null);
          setTailoredVersions(r.tailoredVersions || []);
          // Initialize resume text from parsed data or original text
          if (r.originalText) {
            // Use originalText as primary source (contains complete original text)
            console.log("Using originalText, length:", r.originalText.length);
            setResumeText(r.originalText);
          } else if (r.parsedData?.fullText) {
            // Use fullText if originalText is not available
            console.log(
              "Using parsedData.fullText, length:",
              r.parsedData.fullText.length
            );
            setResumeText(r.parsedData.fullText);
          } else if (r.parsedData) {
            // Fallback to formatted parsed data
            const formattedText = formatParsedData(r.parsedData);
            console.log(
              "Using formatted parsed data, length:",
              formattedText.length
            );
            setResumeText(formattedText);
          }
        }
      } catch (err) {
        console.error("Failed to load resume for tailoring", err);
      }
      try {
        const t = await resumeAPI.getTemplates(resumeId);
        const list = t?.data?.data?.templates || [];
        if (mounted) {
          setTemplates(list);
          if (list.length > 0) setSelectedTemplate(list[0].id);
        }
      } catch (e) {
        /* ignore */
      }
    };

    const startPolling = () => {
      let attempts = 0;
      const maxAttempts = 30;
      const intervalMs = 2000;

      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      pollingRef.current = window.setInterval(async () => {
        attempts++;
        try {
          const res = await api.get(`/resumes/${resumeId}`, {
            params: { _ts: Date.now() },
          });
          const r = res?.data?.data?.resume;
          if (r && mounted) {
            setParsedData(r.parsedData || null);
            setTailoredVersions(r.tailoredVersions || []);
            const pd = r.parsedData;
            const hasText =
              r.originalText ||
              (pd &&
                (typeof pd === "string"
                  ? pd.trim().length > 0
                  : pd.fullText || pd.summary));
            if (hasText) {
              if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          }
        } catch (err) {
          /* ignore */
        }
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, intervalMs);
    };

    loadOnce();
    startPolling();

    return () => {
      mounted = false;
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [resumeId]);

  const requestTemplatePreview = async (templateType: string) => {
    if (!resumeId || tailoredVersions.length === 0) return;
    const tv = tailoredVersions[tailoredVersions.length - 1];
    try {
      const res = await (
        await import("@/services/api")
      ).resumeAPI.generateTemplate(resumeId, {
        templateType,
        tailoredVersionId: tv._id || tv.id,
      });
      setTemplateHtml(res?.data?.data?.html || null);
    } catch (err) {
      console.error("Generate template failed", err);
      setTemplateHtml(null);
    }
  };

  const generateLatexResume = async () => {
    if (!resumeId || tailoredVersions.length === 0) return;
    const tv = tailoredVersions[tailoredVersions.length - 1];
    setIsGeneratingLatex(true);
    try {
      // Use optimized text if available, otherwise use tailored content
      const contentToUse = optimizedText || tv.tailoredContent;
      const res = await api.post(`/resumes/${resumeId}/generate-latex`, {
        tailoredVersionId: tv._id || tv.id,
        content: contentToUse,
      });
      const latex = res?.data?.data?.latex || "";
      setLatexContent(latex);
    } catch (err) {
      console.error("LaTeX generation failed", err);
      setLatexContent("");
    } finally {
      setIsGeneratingLatex(false);
    }
  };

  const compilePdfResume = async () => {
    if (!resumeId || !latexContent) return;
    const tv = tailoredVersions[tailoredVersions.length - 1];
    setIsCompilingPdf(true);
    try {
      const res = await api.post(`/resumes/${resumeId}/compile-latex`, {
        tailoredVersionId: tv._id || tv.id,
        latexContent,
      });
      const pdfBase64 = res?.data?.data?.base64Pdf || "";
      setPdfData(pdfBase64);
    } catch (err) {
      console.error("PDF compilation failed", err);
      setPdfData(null);
    } finally {
      setIsCompilingPdf(false);
    }
  };

  const downloadPdfResume = () => {
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
      a.download = `resume-${resumeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Resume Tailoring
          </h1>
          <p className="text-gray-600">
            Optimize your resume with AI-powered suggestions and professional
            templates
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Resume Text Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Resume Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Your resume text will appear here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Edit your resume text here for optimization
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!resumeId || !resumeText.trim()) return;
                      try {
                        // Update resume text via API using parseLocal endpoint
                        await resumeAPI.parseLocal(resumeId, {
                          parsedText: resumeText,
                        });
                        alert("Resume text updated successfully");
                      } catch (error) {
                        console.error("Failed to update resume text", error);
                        alert("Failed to update resume text");
                      }
                    }}
                  >
                    Update Text
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Job Description Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="Paste the job description here for optimization"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (jobDescription.trim()) {
                        setJobDescriptionSubmitted(true);
                      }
                    }}
                    disabled={!jobDescription.trim() || jobDescriptionSubmitted}
                  >
                    {jobDescriptionSubmitted
                      ? "Submitted"
                      : "Submit Job Description"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Resume Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`relative cursor-pointer rounded-xl border-2 transition-all ${
                        selectedTemplate === template.id
                          ? "border-brand-primary shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                        {template.previewHtml ? (
                          <iframe
                            title={template.name}
                            className="w-full h-full"
                            srcDoc={template.previewHtml}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {template.name}
                          </span>
                          {template.type === "premium" && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      {template.type === "premium" && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-500 text-white text-xs">
                            Premium
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    className="w-full"
                    variant="hero"
                    disabled={!jobDescriptionSubmitted || isTailoring}
                    onClick={async () => {
                      if (!resumeId || !jobDescription.trim()) return;
                      setIsTailoring(true);
                      try {
                        const res = await api.post(
                          `/resumes/${resumeId}/tailor`,
                          {
                            jobDescription: jobDescription.trim(),
                            templateType: selectedTemplate || "professional",
                          }
                        );

                        const data = res?.data?.data;
                        if (data) {
                          setMatchScore(data.matchScore || null);
                          setSuggestions(data.suggestions || []);
                          setOptimizedText(data.optimizedText || "");
                          setLatexContent(data.latex || "");

                          // Refresh tailored versions
                          const resumeRes = await api.get(
                            `/resumes/${resumeId}`
                          );
                          setTailoredVersions(
                            resumeRes?.data?.data?.resume?.tailoredVersions ||
                              []
                          );

                          // Auto-compile to PDF if LaTeX was generated
                          if (data.latex) {
                            setTimeout(async () => {
                              setIsCompilingPdf(true);
                              try {
                                const pdfRes = await api.post(
                                  `/resumes/${resumeId}/compile-latex`,
                                  {
                                    latexContent: data.latex,
                                  }
                                );
                                const pdfBase64 =
                                  pdfRes?.data?.data?.base64Pdf || "";
                                setPdfData(pdfBase64);
                                // Auto-switch to LaTeX editor tab after PDF is compiled
                                setActiveTab("latex");
                              } catch (err) {
                                console.error("PDF compilation failed", err);
                                setPdfData(null);
                              } finally {
                                setIsCompilingPdf(false);
                              }
                            }, 500);
                          }
                        }
                      } catch (err) {
                        console.error("Tailoring failed", err);
                      } finally {
                        setIsTailoring(false);
                      }
                    }}
                  >
                    {isTailoring ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Tailoring Resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Tailor Resume with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Resume Preview</CardTitle>
                  {resumeId && (
                    <div className="text-sm text-gray-500">
                      Resume ID: {resumeId}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!resumeId) return;
                        try {
                          const res = await api.get(`/resumes/${resumeId}`, {
                            params: { _ts: Date.now() },
                          });
                          const r = res?.data?.data?.resume;
                          setParsedData(r?.parsedData || null);
                          setTailoredVersions(r?.tailoredVersions || []);
                        } catch (e) {
                          /* ignore */
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="professional"
                      size="sm"
                      onClick={async () => {
                        if (!resumeId) return;
                        try {
                          // Download last generated template if available; otherwise prompt generation
                          const tv =
                            tailoredVersions[tailoredVersions.length - 1];
                          if (!tv) return;
                          const htmlBlob = new Blob([templateHtml || ""], {
                            type: "text/html",
                          });
                          if (templateHtml) {
                            const url = URL.createObjectURL(htmlBlob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `resume-${resumeId}.html`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          } else {
                            // trigger server-side generation and then allow download
                            const res = await resumeAPI.generateTemplate(
                              resumeId,
                              {
                                templateType: "professional",
                                tailoredVersionId: tv._id || tv.id,
                              }
                            );
                            const html = res?.data?.data?.html || "";
                            setTemplateHtml(html);
                            const url = URL.createObjectURL(
                              new Blob([html], { type: "text/html" })
                            );
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `resume-${resumeId}.html`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }

                          // Finalize pipeline stage upon successful download
                          try {
                            // Ensure we have valid parsed text
                            const parsedText =
                              parsedData?.fullText ||
                              parsedData?.summary ||
                              (parsedData?.personalInfo?.name
                                ? `Resume for ${parsedData.personalInfo.name}`
                                : "Resume data");

                            await api.post(`/resumes/${resumeId}/parse-local`, {
                              parsedText,
                              pipelineStage: "tailoring_complete",
                            });

                            // Trigger analytics after successful download and pipeline update
                            console.log(
                              "Resume downloaded and pipeline stage finalized - analytics should be triggered"
                            );
                          } catch (e) {
                            console.error(
                              "Failed to update pipeline stage:",
                              e
                            );
                            // Continue with download even if pipeline update fails
                          }

                          // Navigate based on pipeline type after successful download
                          try {
                            const currentPipeline =
                              pipelineLib.getCurrentPipeline();
                            if (currentPipeline?.type === "interview") {
                              // Create interview using the tailored resume
                              const jobDescription =
                                "General role based on tailored resume"; // Could be enhanced to use actual JD
                              const interviewResponse = await api.post(
                                "/interviews/create",
                                {
                                  resumeId,
                                  jobDescription,
                                  interviewType: "technical", // Default to technical, could be made configurable
                                }
                              );
                              if (interviewResponse.data.success) {
                                const interviewId =
                                  interviewResponse.data.data.interview._id;
                                setTimeout(() => {
                                  onStartInterview(interviewId);
                                }, 1000);
                              } else {
                                // fallback to dashboard if interview creation fails
                                localStorage.setItem("navigateTo", "dashboard");
                                setTimeout(() => {
                                  window.location.href = "/analytics";
                                }, 1000);
                              }
                            } else {
                              localStorage.setItem("navigateTo", "dashboard");
                              setTimeout(() => {
                                window.location.href = "/analytics";
                              }, 1000);
                            }
                          } catch (e) {
                            /* ignore */
                          }
                        } catch (e) {
                          console.error("Download failed:", e);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="latex">LaTeX Editor</TabsTrigger>
                  </TabsList>

                  <TabsContent value="original" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-8 min-h-[600px] shadow-sm overflow-y-auto">
                      <div className="space-y-6">
                        {resumeText ? (
                          <div>
                            <div className="text-center border-b pb-4">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Resume Preview
                              </h2>
                            </div>
                            <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto">
                              {resumeText}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            No resume text available. Please enter your resume
                            text above.
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="latex" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-purple-200 p-8 min-h-[600px] shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">
                            LaTeX Resume Editor
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={compilePdfResume}
                              disabled={isCompilingPdf || !latexContent}
                            >
                              {isCompilingPdf ? "Compiling..." : "Compile PDF"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (latexContent) {
                                  const blob = new Blob([latexContent], {
                                    type: "text/plain",
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = "resume.tex";
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                }
                              }}
                              disabled={!latexContent}
                            >
                              Download .tex
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadPdfResume}
                              disabled={!pdfData}
                            >
                              Download PDF
                            </Button>
                          </div>
                        </div>

                        {latexContent ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <textarea
                                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none resize-none"
                                  value={latexContent}
                                  onChange={(e) =>
                                    setLatexContent(e.target.value)
                                  }
                                  placeholder="LaTeX content will appear here..."
                                  spellCheck={false}
                                />
                              </div>
                              <div>
                                {pdfData ? (
                                  <iframe
                                    src={`data:application/pdf;base64,${pdfData}`}
                                    className="w-full h-96 border border-gray-300 rounded-lg"
                                    title="PDF Preview"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-96 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                                    <FileText className="h-12 w-12" />
                                    <span className="ml-2">
                                      Compile PDF to see preview
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium mb-2">LaTeX Tips:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>
                                  Use{" "}
                                  <code className="bg-gray-200 px-1 rounded">
                                    \\section&#123;&#125;
                                  </code>{" "}
                                  for main sections
                                </li>
                                <li>
                                  Use{" "}
                                  <code className="bg-gray-200 px-1 rounded">
                                    \\textbf&#123;&#125;
                                  </code>{" "}
                                  for bold text
                                </li>
                                <li>
                                  Use{" "}
                                  <code className="bg-gray-200 px-1 rounded">
                                    \\begin&#123;itemize&#125;...\\end&#123;itemize&#125;
                                  </code>{" "}
                                  for bullet points
                                </li>
                                <li>Compile with pdflatex to generate PDF</li>
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-16">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg mb-2">
                              No LaTeX content generated yet
                            </p>
                            <p className="text-sm">
                              Tailor your resume first, then generate LaTeX
                              content
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" size="lg">
            Back to Upload
          </Button>

          {/* Always show Proceed to Aptitude for interview pipeline, Complete & View Analytics for tailoring pipeline */}
          {currentPipeline?.type === "interview" ? (
            <Button
              variant="hero"
              size="lg"
              className="px-8"
              onClick={async () => {
                try {
                  // Mark tailoring pipeline as complete before proceeding
                  const parsedText =
                    parsedData?.fullText ||
                    parsedData?.summary ||
                    (parsedData?.personalInfo?.name
                      ? `Resume for ${parsedData.personalInfo.name}`
                      : "Resume data");

                  await api.post(`/resumes/${resumeId}/parse-local`, {
                    parsedText,
                    pipelineStage: "tailoring_complete",
                  });

                  // Navigate to aptitude test
                  if (onStartInterview) {
                    onStartInterview();
                  }
                } catch (e) {
                  console.error("Failed to update pipeline:", e);
                  alert("Failed to proceed. Please try again.");
                }
              }}
            >
              Proceed to Aptitude Test
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button
              variant="hero"
              size="lg"
              className="px-8"
              onClick={async () => {
                // Mark tailoring pipeline as complete and exit to dashboard
                try {
                  // Ensure we have valid parsed text
                  const parsedText =
                    parsedData?.fullText ||
                    parsedData?.summary ||
                    (parsedData?.personalInfo?.name
                      ? `Resume for ${parsedData.personalInfo.name}`
                      : "Resume data");

                  await api.post(`/resumes/${resumeId}/parse-local`, {
                    parsedText,
                    pipelineStage: "tailoring_complete",
                  });

                  // Show confirmation and redirect to dashboard
                  alert(
                    "Resume tailoring completed successfully! Redirecting to dashboard..."
                  );
                  localStorage.setItem("navigateTo", "dashboard");
                  window.location.href = "/";
                } catch (e) {
                  console.log(
                    "Pipeline update or navigation failed, continuing...",
                    e
                  );
                  // Still try to navigate to dashboard
                  localStorage.setItem("navigateTo", "dashboard");
                  window.location.href = "/";
                }
              }}
            >
              Complete & View Analytics
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeTailoring;
