import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader,
  Download,
  Sparkles,
  FileText,
  Eye,
  ArrowLeft,
} from "lucide-react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts;

interface ResumeData {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    linkedin?: string;
    location?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
  }>;
}

interface ResumePDFGeneratorProps {
  onNavigate?: (view: string) => void;
}

const ResumePDFGenerator = ({ onNavigate }: ResumePDFGeneratorProps = {}) => {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ResumeData | null>(null);
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [showBackConfirm, setShowBackConfirm] = useState<boolean>(false);
  const [lastApiCall, setLastApiCall] = useState<number>(0);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const MIN_API_CALL_INTERVAL = 2000; // Minimum 2 seconds between API calls

  const showMessage = (msg: string, error: boolean = false) => {
    setMessage(msg);
    setIsError(error);
  };

  const callGeminiAPI = async (payload: any, maxRetries: number = 5) => {
    const apiKey = GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Enforce minimum interval between API calls
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
      const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
      console.log(`Waiting ${waitTime}ms to respect rate limits...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setLastApiCall(Date.now());
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          // For rate limit errors, use longer exponential backoff
          const baseDelay = 3000; // Start with 3 seconds
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `Rate limit exceeded. Retrying in ${Math.floor(
              delay / 1000
            )} seconds...`
          );
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(
            "Gemini API rate limit exceeded. Please wait a few minutes and try again, or consider upgrading your API quota."
          );
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `API request failed with status ${response.status}: ${errorBody}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error(
          `Attempt ${attempt + 1} of ${maxRetries} failed:`,
          (error as Error).message
        );
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to connect to Gemini API after ${maxRetries} attempts. ${
              (error as Error).message
            }`
          );
        }
        // For non-429 errors, use shorter delays
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Retrying in ${Math.floor(delay / 1000)} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const confirmBack = () => {
    if (onNavigate) {
      onNavigate("dashboard");
    } else {
      window.location.href = "/";
    }
  };

  const cancelBack = () => {
    setShowBackConfirm(false);
  };

  const extractResumeData = async () => {
    if (!resumeText.trim()) {
      showMessage("Please provide your resume text.", true);
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setExtractedData(null);
    setOptimizedData(null);

    try {
      const systemPrompt = `You are a Resume Parser AI. Extract structured data from the resume text and return it as valid JSON. The JSON should have this exact structure:

{
  "name": "Full Name",
  "contact": {
    "email": "email@example.com",
    "phone": "phone number",
    "linkedin": "LinkedIn URL",
    "location": "City, State/Country"
  },
  "summary": "Professional summary paragraph",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "description": ["Bullet point 1", "Bullet point 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "location": "City, State",
      "graduationDate": "MM/YYYY",
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": {
    "technical": ["Skill1", "Skill2"],
    "soft": ["SoftSkill1", "SoftSkill2"]
  },
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "MM/YYYY"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["Tech1", "Tech2"],
      "url": "project URL"
    }
  ]
}

Return ONLY the JSON object, no additional text or formatting.`;

      const combinedPrompt = `${systemPrompt}\n\nExtract structured data from this resume text:\n\n${resumeText}`;

      const payload = {
        contents: [{ parts: [{ text: combinedPrompt }] }],
      };

      const result = await callGeminiAPI(payload);
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        // Clean the response to extract JSON
        let jsonText = generatedText.trim();
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedData: ResumeData = JSON.parse(jsonText);
        setExtractedData(parsedData);
        showMessage(
          "Resume data extracted successfully! Now optimize for the job description.",
          false
        );
      } else {
        throw new Error("Could not extract valid data from the AI response.");
      }
    } catch (error) {
      console.error("Data extraction error:", error);
      const errorMsg = (error as Error).message;

      // Provide user-friendly error messages
      if (errorMsg.includes("rate limit")) {
        showMessage(
          "⏳ Gemini API rate limit reached. Please wait 2-3 minutes before trying again, or consider using a different API key with higher quota.",
          true
        );
      } else if (errorMsg.includes("Failed to connect")) {
        showMessage(
          "❌ Network error. Please check your internet connection and try again.",
          true
        );
      } else {
        showMessage(
          `Data extraction failed: ${errorMsg}. Please check your input and try again.`,
          true
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const optimizeResumeData = async () => {
    if (!extractedData || !jobDescription.trim()) {
      showMessage(
        "Please extract resume data first and provide a job description.",
        true
      );
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setOptimizedData(null);

    try {
      const systemPrompt = `You are a Resume Optimization AI. Take the structured resume data and optimize it for the specific job description. Focus on:

1. Reorder and emphasize experience most relevant to the job
2. Add keywords from the job description naturally
3. Strengthen achievements with quantifiable results
4. Tailor the summary to match job requirements
5. Prioritize skills that match the job posting

Return the optimized resume data in the SAME JSON structure as the input. Only modify the content to be more relevant to the job description. Do not add or remove sections.`;

      const combinedPrompt = `${systemPrompt}\n\nOriginal Resume Data:\n${JSON.stringify(
        extractedData,
        null,
        2
      )}\n\nJob Description:\n${jobDescription}`;

      const payload = {
        contents: [{ parts: [{ text: combinedPrompt }] }],
      };

      const result = await callGeminiAPI(payload);
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        let jsonText = generatedText.trim();
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/```\s*/, "").replace(/\s*```$/, "");
        }

        const optimized: ResumeData = JSON.parse(jsonText);
        setOptimizedData(optimized);
        showMessage(
          "Resume optimized successfully! You can now generate the PDF.",
          false
        );
      } else {
        throw new Error("Could not get valid optimized data from the AI.");
      }
    } catch (error) {
      console.error("Optimization error:", error);
      const errorMsg = (error as Error).message;

      // Provide user-friendly error messages
      if (errorMsg.includes("rate limit")) {
        showMessage(
          "⏳ Gemini API rate limit reached. Please wait 2-3 minutes before trying again, or consider using a different API key with higher quota.",
          true
        );
      } else if (errorMsg.includes("Failed to connect")) {
        showMessage(
          "❌ Network error. Please check your internet connection and try again.",
          true
        );
      } else {
        showMessage(
          `Optimization failed: ${errorMsg}. Please try again in a moment.`,
          true
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = () => {
    if (!optimizedData) {
      showMessage("Please optimize your resume data first.", true);
      return;
    }

    setIsGeneratingPDF(true);
    setMessage("");

    try {
      const docDefinition: any = {
        pageSize: "LETTER",
        pageMargins: [40, 60, 40, 60],
        content: [],
        styles: {
          header: {
            fontSize: 24,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 20],
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            margin: [0, 15, 0, 8],
            color: "#2c3e50",
          },
          contact: {
            fontSize: 10,
            alignment: "center",
            margin: [0, 0, 0, 15],
          },
          summary: {
            fontSize: 11,
            lineHeight: 1.4,
            margin: [0, 0, 0, 15],
          },
          experienceTitle: {
            fontSize: 12,
            bold: true,
            margin: [0, 8, 0, 2],
          },
          experienceCompany: {
            fontSize: 11,
            italics: true,
            margin: [0, 0, 0, 2],
          },
          experienceDate: {
            fontSize: 10,
            alignment: "right",
            margin: [0, 0, 0, 2],
          },
          bullet: {
            fontSize: 10,
            margin: [15, 2, 0, 2],
          },
          skills: {
            fontSize: 10,
            margin: [0, 2, 0, 2],
          },
        },
      };

      // Header - Name
      docDefinition.content.push({
        text: optimizedData.name,
        style: "header",
      });

      // Contact Information
      const contactParts = [];
      if (optimizedData.contact.email)
        contactParts.push(optimizedData.contact.email);
      if (optimizedData.contact.phone)
        contactParts.push(optimizedData.contact.phone);
      if (optimizedData.contact.linkedin)
        contactParts.push(optimizedData.contact.linkedin);
      if (optimizedData.contact.location)
        contactParts.push(optimizedData.contact.location);

      if (contactParts.length > 0) {
        docDefinition.content.push({
          text: contactParts.join(" | "),
          style: "contact",
        });
      }

      // Summary
      if (optimizedData.summary) {
        docDefinition.content.push({
          text: "PROFESSIONAL SUMMARY",
          style: "sectionHeader",
        });
        docDefinition.content.push({
          text: optimizedData.summary,
          style: "summary",
        });
      }

      // Experience
      if (optimizedData.experience && optimizedData.experience.length > 0) {
        docDefinition.content.push({
          text: "PROFESSIONAL EXPERIENCE",
          style: "sectionHeader",
        });

        optimizedData.experience.forEach((exp) => {
          // Job title and company
          const titleRow = {
            columns: [
              {
                text: `${exp.title} - ${exp.company}`,
                style: "experienceTitle",
                width: "*",
              },
              {
                text: `${exp.startDate} - ${exp.endDate || "Present"}`,
                style: "experienceDate",
                width: "auto",
              },
            ],
          };
          docDefinition.content.push(titleRow);

          // Location if available
          if (exp.location) {
            docDefinition.content.push({
              text: exp.location,
              style: "experienceCompany",
            });
          }

          // Bullet points
          if (exp.description && exp.description.length > 0) {
            exp.description.forEach((bullet) => {
              docDefinition.content.push({
                text: `• ${bullet}`,
                style: "bullet",
              });
            });
          }

          // Add some space after each experience
          docDefinition.content.push({ text: "", margin: [0, 5, 0, 0] });
        });
      }

      // Education
      if (optimizedData.education && optimizedData.education.length > 0) {
        docDefinition.content.push({
          text: "EDUCATION",
          style: "sectionHeader",
        });

        optimizedData.education.forEach((edu) => {
          const eduRow = {
            columns: [
              {
                text: `${edu.degree} - ${edu.institution}`,
                style: "experienceTitle",
                width: "*",
              },
              {
                text: edu.graduationDate || "",
                style: "experienceDate",
                width: "auto",
              },
            ],
          };
          docDefinition.content.push(eduRow);

          if (edu.location) {
            docDefinition.content.push({
              text: edu.location,
              style: "experienceCompany",
            });
          }

          if (edu.gpa) {
            docDefinition.content.push({
              text: `GPA: ${edu.gpa}`,
              style: "skills",
            });
          }
        });
      }

      // Skills
      if (
        optimizedData.skills &&
        (optimizedData.skills.technical.length > 0 ||
          optimizedData.skills.soft.length > 0)
      ) {
        docDefinition.content.push({
          text: "SKILLS",
          style: "sectionHeader",
        });

        if (optimizedData.skills.technical.length > 0) {
          docDefinition.content.push({
            text: `Technical: ${optimizedData.skills.technical.join(", ")}`,
            style: "skills",
          });
        }

        if (optimizedData.skills.soft.length > 0) {
          docDefinition.content.push({
            text: `Soft Skills: ${optimizedData.skills.soft.join(", ")}`,
            style: "skills",
          });
        }
      }

      // Certifications
      if (
        optimizedData.certifications &&
        optimizedData.certifications.length > 0
      ) {
        docDefinition.content.push({
          text: "CERTIFICATIONS",
          style: "sectionHeader",
        });

        optimizedData.certifications.forEach((cert) => {
          const certText = cert.date
            ? `${cert.name} - ${cert.issuer} (${cert.date})`
            : `${cert.name} - ${cert.issuer}`;
          docDefinition.content.push({
            text: certText,
            style: "skills",
          });
        });
      }

      // Projects
      if (optimizedData.projects && optimizedData.projects.length > 0) {
        docDefinition.content.push({
          text: "PROJECTS",
          style: "sectionHeader",
        });

        optimizedData.projects.forEach((project) => {
          docDefinition.content.push({
            text: project.name,
            style: "experienceTitle",
          });

          if (project.description) {
            docDefinition.content.push({
              text: project.description,
              style: "bullet",
            });
          }

          if (project.technologies && project.technologies.length > 0) {
            docDefinition.content.push({
              text: `Technologies: ${project.technologies.join(", ")}`,
              style: "skills",
            });
          }

          if (project.url) {
            docDefinition.content.push({
              text: project.url,
              style: "skills",
            });
          }
        });
      }

      // Generate and download PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const filename = `${optimizedData.name.replace(/\s+/g, "_")}_Resume.pdf`;
      pdfDoc.download(filename);

      showMessage("PDF generated and downloaded successfully!", false);
    } catch (error) {
      console.error("PDF generation error:", error);
      showMessage(`PDF generation failed: ${(error as Error).message}`, true);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackClick} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Resume PDF Generator
            </h1>
            <p className="text-gray-600">
              Extract, optimize, and generate professional PDF resumes using AI
            </p>
          </div>
          <div className="w-40"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Resume Text Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Resume Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={12}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your complete resume text here. Include your name, contact info, experience, education, and skills."
                  className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
                />
                <div className="mt-4">
                  <Button
                    onClick={extractResumeData}
                    disabled={isProcessing || !resumeText.trim()}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract Resume Data
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Job Description Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={8}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description you want to optimize for. This helps tailor your resume with relevant keywords and experiences."
                  className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-colors"
                />
                <div className="mt-4">
                  <Button
                    onClick={optimizeResumeData}
                    disabled={
                      isProcessing || !extractedData || !jobDescription.trim()
                    }
                    className="w-full"
                    variant="secondary"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Optimize for Job
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generate PDF Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF || !optimizedData}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Generate & Download PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Messages */}
            {message && (
              <Alert
                className={
                  isError
                    ? "border-red-300 bg-red-50"
                    : "border-green-300 bg-green-50"
                }
              >
                <AlertDescription
                  className={isError ? "text-red-700" : "text-green-700"}
                >
                  {message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Resume Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[600px] overflow-y-auto">
                  {optimizedData ? (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="text-center border-b pb-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {optimizedData.name}
                        </h2>
                        <div className="text-sm text-gray-600 mt-2">
                          {[
                            optimizedData.contact.email,
                            optimizedData.contact.phone,
                            optimizedData.contact.linkedin,
                            optimizedData.contact.location,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                      </div>

                      {/* Summary */}
                      {optimizedData.summary && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Professional Summary
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {optimizedData.summary}
                          </p>
                        </div>
                      )}

                      {/* Experience */}
                      {optimizedData.experience &&
                        optimizedData.experience.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              Professional Experience
                            </h3>
                            <div className="space-y-4">
                              {optimizedData.experience.map((exp, index) => (
                                <div key={index}>
                                  <div className="flex justify-between items-start mb-1">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">
                                        {exp.title}
                                      </h4>
                                      <p className="text-sm text-gray-600 italic">
                                        {exp.company}
                                      </p>
                                      {exp.location && (
                                        <p className="text-xs text-gray-500">
                                          {exp.location}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {exp.startDate} -{" "}
                                      {exp.endDate || "Present"}
                                    </span>
                                  </div>
                                  <ul className="text-sm text-gray-700 ml-4 space-y-1">
                                    {exp.description.map(
                                      (bullet, bulletIndex) => (
                                        <li
                                          key={bulletIndex}
                                          className="flex items-start"
                                        >
                                          <span className="text-gray-400 mr-2">
                                            •
                                          </span>
                                          <span>{bullet}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Education */}
                      {optimizedData.education &&
                        optimizedData.education.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              Education
                            </h3>
                            <div className="space-y-2">
                              {optimizedData.education.map((edu, index) => (
                                <div key={index}>
                                  <div className="flex justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">
                                        {edu.degree}
                                      </h4>
                                      <p className="text-sm text-gray-600">
                                        {edu.institution}
                                      </p>
                                      {edu.location && (
                                        <p className="text-xs text-gray-500">
                                          {edu.location}
                                        </p>
                                      )}
                                      {edu.gpa && (
                                        <p className="text-xs text-gray-500">
                                          GPA: {edu.gpa}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {edu.graduationDate}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Skills */}
                      {optimizedData.skills &&
                        (optimizedData.skills.technical.length > 0 ||
                          optimizedData.skills.soft.length > 0) && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              Skills
                            </h3>
                            {optimizedData.skills.technical.length > 0 && (
                              <div className="mb-2">
                                <span className="font-medium text-gray-700">
                                  Technical:{" "}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {optimizedData.skills.technical.join(", ")}
                                </span>
                              </div>
                            )}
                            {optimizedData.skills.soft.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Soft Skills:{" "}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {optimizedData.skills.soft.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Certifications */}
                      {optimizedData.certifications &&
                        optimizedData.certifications.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              Certifications
                            </h3>
                            <div className="space-y-1">
                              {optimizedData.certifications.map(
                                (cert, index) => (
                                  <li
                                    key={index}
                                    className="text-sm text-gray-700"
                                  >
                                    {cert.name} - {cert.issuer}{" "}
                                    {cert.date && `(${cert.date})`}
                                  </li>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Projects */}
                      {optimizedData.projects &&
                        optimizedData.projects.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              Projects
                            </h3>
                            <div className="space-y-3">
                              {optimizedData.projects.map((project, index) => (
                                <div key={index}>
                                  <h4 className="font-semibold text-gray-900">
                                    {project.name}
                                  </h4>
                                  <p className="text-sm text-gray-700 mb-1">
                                    {project.description}
                                  </p>
                                  {project.technologies &&
                                    project.technologies.length > 0 && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Technologies:
                                        </span>{" "}
                                        {project.technologies.join(", ")}
                                      </p>
                                    )}
                                  {project.url && (
                                    <p className="text-xs text-blue-600">
                                      {project.url}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : extractedData ? (
                    <div className="text-center text-gray-500 py-16">
                      <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg mb-2">Resume data extracted!</p>
                      <p className="text-sm">
                        Now provide a job description and optimize your resume.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-16">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg mb-2">No resume data yet</p>
                      <p className="text-sm">
                        Paste your resume text and extract the data to get
                        started.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Confirmation Modal */}
        {showBackConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Confirm Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to go back to the dashboard? Any unsaved
                  progress will be lost.
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

export default ResumePDFGenerator;
