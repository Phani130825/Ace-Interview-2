import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface InterviewCreationModalProps {
  interviewType: "hr" | "managerial" | "technical";
  onCreate: (data: {
    resumeText: string;
    jobDescription: {
      title: string;
      company: string;
      description: string;
      requiredSkills: string[];
      responsibilities: string[];
      requirements: string[];
    };
  }) => void;
  children: React.ReactNode;
}

const InterviewCreationModal: React.FC<InterviewCreationModalProps> = ({
  interviewType,
  onCreate,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !resumeText.trim() ||
      !jobTitle.trim() ||
      !company.trim() ||
      !jobDescription.trim()
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        resumeText: resumeText.trim(),
        jobDescription: {
          title: jobTitle.trim(),
          company: company.trim(),
          description: jobDescription.trim(),
          requiredSkills: requiredSkills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          responsibilities: responsibilities
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r),
          requirements: requirements
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r),
        },
      });
      setOpen(false);
      // Reset form
      setResumeText("");
      setJobTitle("");
      setCompany("");
      setJobDescription("");
      setRequiredSkills("");
      setResponsibilities("");
      setRequirements("");
    } catch (error) {
      console.error("Failed to create interview:", error);
      alert("Failed to create interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeDisplay = () => {
    switch (interviewType) {
      case "hr":
        return "HR Interview";
      case "managerial":
        return "Managerial Interview";
      case "technical":
        return "Technical Interview";
    }
  };

  const getTypeDescription = () => {
    switch (interviewType) {
      case "hr":
        return "Practice behavioral questions and cultural fit scenarios";
      case "managerial":
        return "Practice leadership and strategic decision-making questions";
      case "technical":
        return "Practice domain-specific and coding-related questions";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create {getTypeDisplay()}
            <Badge variant="secondary">{interviewType.toUpperCase()}</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getTypeDescription()}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Text */}
          <div>
            <Label htmlFor="resumeText" className="text-sm font-medium">
              Resume Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="resumeText"
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[120px] mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Copy and paste the text content of your resume
            </p>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle" className="text-sm font-medium">
                Job Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-sm font-medium">
                Company <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company"
                placeholder="e.g., Tech Corp Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="jobDescription" className="text-sm font-medium">
              Job Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="jobDescription"
              placeholder="Describe the job role, responsibilities, and requirements..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[80px] mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="requiredSkills" className="text-sm font-medium">
              Required Skills
            </Label>
            <Input
              id="requiredSkills"
              placeholder="e.g., JavaScript, React, Node.js (comma-separated)"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="responsibilities" className="text-sm font-medium">
              Key Responsibilities
            </Label>
            <Textarea
              id="responsibilities"
              placeholder="List key responsibilities (one per line)..."
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className="min-h-[60px] mt-1"
            />
          </div>

          <div>
            <Label htmlFor="requirements" className="text-sm font-medium">
              Additional Requirements
            </Label>
            <Textarea
              id="requirements"
              placeholder="List additional requirements or qualifications (one per line)..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="min-h-[60px] mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Interview"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewCreationModal;
