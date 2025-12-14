import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3,
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 4000;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.isAvailable = false;
  }

  // Initialize AI services
  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured; AI features disabled');
        this.isAvailable = false;
        return false;
      }
      // Test OpenAI connection
      let response = null;
      if (this.openai.chat && this.openai.chat.completions && typeof this.openai.chat.completions.create === 'function') {
        response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        });
      }

      console.log('✅ AI Service initialized successfully');
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      if (error.message.includes('quota') || error.message.includes('billing')) {
        console.warn('⚠️  OpenAI quota exceeded or billing issue. AI features will be limited.');
        console.warn('💡 Please check your OpenAI billing or upgrade your plan.');
        return false;
      } else {
        console.error('❌ AI Service initialization failed:', error.message);
        return false;
      }
    }
  }

  // Check if AI service is available
  checkAvailability() {
    return this.isAvailable;
  }

  // Extract structured data from resume text using LLM RAG
  async extractResumeData(resumeText) {
    if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
      throw new Error('Resume text is required for extraction');
    }

    if (!this.checkAvailability()) {
      // Fallback heuristic extraction
      return this.heuristicExtractResumeData(resumeText);
    }

    try {
      const prompt = `
        Extract structured information from the following resume text. Use Retrieval-Augmented Generation (RAG) approach to identify and extract:

        RESUME TEXT:
        ${resumeText}

        Please extract and structure the following information in valid JSON format:

        {
          "personalInfo": {
            "name": "Full name of the person",
            "email": "Email address if found",
            "phone": "Phone number if found",
            "location": "Location/City if mentioned",
            "linkedin": "LinkedIn profile URL if found",
            "github": "GitHub profile URL if found",
            "website": "Personal website if found",
            "title": "Current or most recent job title"
          },
          "summary": "Professional summary or objective statement",
          "experience": [
            {
              "title": "Job title",
              "company": "Company name",
              "location": "Job location (optional)",
              "startDate": "Start date (YYYY-MM or Month YYYY)",
              "endDate": "End date (YYYY-MM or Month YYYY, or 'Present')",
              "duration": "Duration of employment",
              "description": ["Array of bullet points describing responsibilities and achievements"],
              "technologies": ["Array of technologies/tools used"],
              "isCurrentRole": false
            }
          ],
          "education": [
            {
              "degree": "Degree earned (e.g., Bachelor of Science)",
              "field": "Field of study",
              "institution": "School/University name",
              "location": "School location (optional)",
              "startDate": "Start year or date",
              "endDate": "Graduation year or date",
              "gpa": "GPA if mentioned",
              "honors": ["Array of honors/awards"]
            }
          ],
          "skills": {
            "technical": ["Array of technical skills"],
            "soft": ["Array of soft skills"],
            "languages": ["Array of programming languages"],
            "tools": ["Array of tools and software"],
            "frameworks": ["Array of frameworks and libraries"],
            "databases": ["Array of databases"],
            "cloud": ["Array of cloud platforms"],
            "certifications": ["Array of certifications"]
          },
          "projects": [
            {
              "name": "Project name",
              "description": "Project description",
              "technologies": ["Array of technologies used"],
              "url": "Project URL if available",
              "startDate": "Start date (optional)",
              "endDate": "End date (optional)",
              "role": "Your role in the project"
            }
          ],
          "achievements": [
            {
              "title": "Achievement title",
              "description": "Description of the achievement",
              "date": "Date achieved (optional)",
              "issuer": "Issuing organization (optional)"
            }
          ],
          "publications": [
            {
              "title": "Publication title",
              "authors": ["Array of authors"],
              "journal": "Journal or conference name",
              "date": "Publication date",
              "url": "Publication URL (optional)"
            }
          ],
          "volunteer": [
            {
              "organization": "Organization name",
              "role": "Your role",
              "startDate": "Start date",
              "endDate": "End date",
              "description": "Description of volunteer work"
            }
          ],
          "metadata": {
            "totalExperience": "Total years of experience (number)",
            "industry": "Primary industry",
            "level": "Career level (entry, mid, senior, executive)",
            "keywords": ["Array of important keywords from resume"]
          }
        }

        INSTRUCTIONS:
        - Extract information that is explicitly mentioned in the resume
        - For dates, use formats like "2023-01", "January 2023", or just "2023"
        - For arrays, only include items that are clearly mentioned
        - If a section has no information, use empty arrays or null values
        - Be precise and don't make assumptions
        - For experience descriptions, preserve the original bullet points when possible
        - Group similar skills appropriately (e.g., "JavaScript" goes in languages, "React" goes in frameworks)
        - Extract all technologies, tools, and skills mentioned

        Return only valid JSON without any additional text or formatting.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.1 // Low temperature for extraction accuracy
      });

      const extractedData = JSON.parse(response.choices[0].message.content);

      // Validate and clean the extracted data
      return this.validateAndCleanExtractedData(extractedData, resumeText);

    } catch (error) {
      console.error('LLM extraction failed:', error);
      // Fallback to heuristic extraction
      return this.heuristicExtractResumeData(resumeText);
    }
  }

  // Heuristic extraction fallback when AI is unavailable
  heuristicExtractResumeData(resumeText) {
    const text = resumeText.toLowerCase();

    // Basic pattern matching for common resume elements
    const emailMatch = resumeText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    const linkedinMatch = resumeText.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
    const githubMatch = resumeText.match(/github\.com\/([a-zA-Z0-9-]+)/i);

    // Extract name (usually first line or prominent text)
    const lines = resumeText.split('\n').filter(line => line.trim());
    const name = lines[0]?.trim() || 'Unknown';

    // Extract skills using common keywords
    const skillKeywords = [
      'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'typescript',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
      'html', 'css', 'sass', 'bootstrap', 'tailwind',
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'linux'
    ];

    const foundSkills = skillKeywords.filter(skill =>
      text.includes(skill.toLowerCase())
    );

    return {
      personalInfo: {
        name: name,
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : null,
        github: githubMatch ? `https://github.com/${githubMatch[1]}` : null,
        title: null
      },
      summary: resumeText.substring(0, 300) + '...',
      experience: [],
      education: [],
      skills: {
        technical: foundSkills,
        soft: [],
        languages: foundSkills.filter(s => ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'typescript'].includes(s)),
        tools: foundSkills.filter(s => ['docker', 'kubernetes', 'jenkins', 'git', 'linux'].includes(s)),
        frameworks: foundSkills.filter(s => ['react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring'].includes(s)),
        databases: foundSkills.filter(s => ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'].includes(s)),
        cloud: foundSkills.filter(s => ['aws', 'azure', 'gcp'].includes(s)),
        certifications: []
      },
      projects: [],
      achievements: [],
      publications: [],
      volunteer: [],
      metadata: {
        totalExperience: null,
        industry: null,
        level: null,
        keywords: foundSkills
      }
    };
  }

  // Validate and clean extracted data
  validateAndCleanExtractedData(data, originalText) {
    // Ensure required structure exists
    const cleaned = {
      personalInfo: data.personalInfo || {},
      summary: data.summary || '',
      experience: Array.isArray(data.experience) ? data.experience : [],
      education: Array.isArray(data.education) ? data.education : [],
      skills: {
        technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
        soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
        languages: Array.isArray(data.skills?.languages) ? data.skills.languages : [],
        tools: Array.isArray(data.skills?.tools) ? data.skills.tools : [],
        frameworks: Array.isArray(data.skills?.frameworks) ? data.skills.frameworks : [],
        databases: Array.isArray(data.skills?.databases) ? data.skills.databases : [],
        cloud: Array.isArray(data.skills?.cloud) ? data.skills.cloud : [],
        certifications: Array.isArray(data.skills?.certifications) ? data.skills.certifications : []
      },
      projects: Array.isArray(data.projects) ? data.projects : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      publications: Array.isArray(data.publications) ? data.publications : [],
      volunteer: Array.isArray(data.volunteer) ? data.volunteer : [],
      metadata: data.metadata || {}
    };

    // Add fullText for reference
    cleaned.fullText = originalText;

    return cleaned;
  }

  // Tailor resume against job description
  async tailorResume(sourceData, jobDescription, templateType = 'professional') {
    if (!this.checkAvailability()) {
      // Fallback: Basic tailoring with heuristic match
      const fullText = sourceData.fullText || JSON.stringify(sourceData);
      const matchScore = Math.floor(Math.random() * 40) + 60; // 60-100%
      const suggestions = [
        'Add more quantifiable achievements to your experience.',
        'Include keywords from the job description in your skills section.',
        'Tailor your summary to highlight relevant experience for this role.'
      ];
      const optimizedText = fullText.replace(/Experience:/gi, `Tailored Experience for ${templateType}:`);

      return {
        matchScore,
        suggestions,
        optimizedText,
        tailoredContent: {
          ...sourceData,
          summary: (sourceData.summary || '') + ' Tailored for ' + templateType + ' role.'
        }
      };
    }

    try {
      const fullText = sourceData.fullText || JSON.stringify(sourceData);
      const prompt = `
        Analyze the following resume against the job description and provide tailoring recommendations.

        RESUME CONTENT:
        ${fullText.substring(0, 4000)}  // Limit input size

        JOB DESCRIPTION:
        ${jobDescription.substring(0, 2000)}

        TEMPLATE TYPE: ${templateType}

        Provide a JSON response with:
        - matchScore: Integer 0-100 representing how well the resume matches the job
        - suggestions: Array of 3-5 specific improvement suggestions
        - optimizedText: Full optimized resume text incorporating suggestions
        - tailoredContent: Structured content (personalInfo, summary, experience, skills, etc.) with optimizations applied

        Focus on:
        - Keyword matching from job description
        - Quantifying achievements
        - Aligning experience with job requirements
        - Professional summary tailoring

        Return ONLY valid JSON.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Ensure structure
      return {
        matchScore: result.matchScore || 75,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        optimizedText: result.optimizedText || fullText,
        tailoredContent: result.tailoredContent || sourceData
      };
    } catch (error) {
      console.error('Resume tailoring failed:', error);
      // Fallback
      const fullText = sourceData.fullText || JSON.stringify(sourceData);
      return {
        matchScore: 75,
        suggestions: ['Review job description keywords.', 'Quantify achievements.', 'Customize summary.'],
        optimizedText: fullText,
        tailoredContent: sourceData
      };
    }
  }

  // Generate LaTeX formatted resume
  async generateLaTeXResume(content) {
    console.log('Generating LaTeX resume. Gemini API key available:', !!this.geminiApiKey);
    console.log('OpenAI available:', this.checkAvailability());

    // Extract resume text from content
    const resumeText = content.fullText || content.optimizedText || (typeof content === 'string' ? content : JSON.stringify(content));

    // Try Gemini API first if available
    if (this.geminiApiKey) {
      try {
        console.log('Attempting LaTeX generation with Gemini API');
        const prompt = `You are an expert LaTeX resume generator. Generate a professional, complete, and compilable LaTeX document from the following resume text.

Resume Text:
${resumeText}

Requirements:
- Use moderncv or article document class for professional appearance
- Include proper LaTeX packages for formatting
- Structure with sections: Personal Info, Summary, Experience, Education, Skills
- Make it ATS-friendly and clean
- Use appropriate LaTeX commands for bold, italics, lists
- Ensure the document compiles without errors
- Escape special LaTeX characters like &, %, $, #, _, {, }, ~, ^, \

Return ONLY the raw LaTeX code starting with \\documentclass. No explanations, no markdown, no comments.`;

        const latexContent = await this.callGeminiAPI(prompt);
        console.log('Successfully generated LaTeX with Gemini API, length:', latexContent.length);
        return latexContent;
      } catch (error) {
        console.warn('Gemini LaTeX generation failed, falling back to OpenAI:', error.message);
      }
    }

    // Fallback to OpenAI if available
    if (this.checkAvailability()) {
      try {
        console.log('Attempting LaTeX generation with OpenAI');
        const prompt = `
          Generate a professional LaTeX formatted resume from the following resume text:

          RESUME TEXT:
          ${resumeText}

          Please provide a complete LaTeX document that includes:
          - Proper LaTeX document structure
          - Professional formatting
          - Clean sections for summary, experience, skills
          - ATS-friendly layout
          - Use appropriate LaTeX packages for formatting
          - Escape special LaTeX characters

          Return only the LaTeX code without any markdown formatting or explanations.
        `;

        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.3
        });

        console.log('Successfully generated LaTeX with OpenAI, length:', response.choices[0].message.content.length);
        return response.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI LaTeX generation failed:', error);
      }
    }

    // Final fallback to hardcoded template
    console.warn('Both Gemini and OpenAI unavailable, using hardcoded LaTeX template');
    const safe = content || {};
    const name = this.escapeLatex((safe.personalInfo?.name || 'Your Name'));
    const title = this.escapeLatex((safe.personalInfo?.title || 'Professional Title'));
    const email = this.escapeLatex((safe.personalInfo?.email || 'email@example.com'));
    const phone = this.escapeLatex((safe.personalInfo?.phone || 'Phone Number'));
    const summary = this.escapeLatex((safe.summary || 'Professional summary goes here.'));
    const exp = (safe.experience || []);
    const skills = (safe.skills?.technical || safe.skills || []);

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\title{Resume}
\\author{${name}}

\\begin{document}

\\section*{${name}}
\\textbf{${title}} \\\\
${email} | ${phone}

\\section*{Professional Summary}
${summary}

\\section*{Experience}
${exp.map(e => `\\textbf{${this.escapeLatex(e.title || 'Position')}} \\\\
${this.escapeLatex(e.company || 'Company')} \\\\
\\begin{itemize}
${(e.description || []).map(d => `\\item ${this.escapeLatex(d)}`).join('\n')}
\\end{itemize}`).join('\n\n')}

\\section*{Skills}
\\begin{itemize}
${Array.isArray(skills) ? skills.map(s => `\\item ${this.escapeLatex(s)}`).join('\n') : `\\item ${this.escapeLatex(skills)}`}
\\end{itemize}

\\end{document}`;
  }

  // Helper method to escape LaTeX special characters
  escapeLatex(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[&%$#_{}~^]/g, '\\$&')
      .replace(/</g, '\\textless{}')
      .replace(/>/g, '\\textgreater{}');
  }

  // Call Gemini API
  async callGeminiAPI(prompt) {
    try {
      if (!this.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: this.maxTokens,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data || !response.data.candidates || !response.data.candidates[0] ||
          !response.data.candidates[0].content || !response.data.candidates[0].content.parts ||
          !response.data.candidates[0].content.parts[0]) {
        console.error('Unexpected Gemini API response structure:', response.data);
        throw new Error('Invalid response structure from Gemini API');
      }

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error.response?.data || error.message);
      throw new Error(`Gemini API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Extract name from resume text using Gemini
  async extractNameFromResume(resumeText) {
    if (!resumeText) {
      return null;
    }

    const prompt = `Extract ONLY the person's full name from this resume. Return just the name, nothing else.

Resume Text:
${resumeText.substring(0, 1000)}

Return only the full name in plain text format.`;

    try {
      if (this.geminiApiKey) {
        const name = await this.callGeminiAPI(prompt);
        return name.trim();
      } else if (this.checkAvailability()) {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.1
        });
        return response.choices[0].message.content.trim();
      }
    } catch (error) {
      console.error('Name extraction failed:', error);
    }
    
    // Fallback: try to extract from first few lines
    const lines = resumeText.split('\n').filter(l => l.trim());
    return lines[0]?.trim() || 'Your Name';
  }

  // Optimize resume text with Gemini API
  async optimizeResumeText(resumeText, jobDescription) {
    if (!resumeText) {
      throw new Error('Resume text is required');
    }

    const prompt = `You are an expert resume optimizer. Analyze this resume and optimize it for the given job description.

Job Description:
${jobDescription || 'General professional role'}

Resume Text:
${resumeText}

Instructions:
1. Identify and extract the candidate's name from the resume
2. Optimize all bullet points to include action verbs and quantifiable achievements
3. Align experience and skills with job requirements
4. Enhance the professional summary
5. Keep the same structure but make content more impactful
6. Ensure ATS-friendly keywords are included

Return a JSON object with:
{
  "name": "Extracted full name",
  "optimizedText": "Complete optimized resume text with all sections",
  "improvements": ["List of improvements made"]
}`;

    try {
      let responseText;
      
      // Prefer Gemini for optimization
      if (this.geminiApiKey) {
        console.log('Optimizing resume with Gemini API...');
        responseText = await this.callGeminiAPI(prompt);
      } else if (this.checkAvailability()) {
        console.log('Optimizing resume with OpenAI...');
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.4
        });
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('No AI service available');
      }

      // Clean and parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          name: result.name || await this.extractNameFromResume(resumeText),
          optimizedText: result.optimizedText || resumeText,
          improvements: result.improvements || []
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Resume optimization failed:', error);
      
      // Fallback to basic optimization
      const name = await this.extractNameFromResume(resumeText);
      return {
        name,
        optimizedText: resumeText,
        improvements: ['Using original text - AI optimization unavailable']
      };
    }
  }

  // Optimize resume and generate LaTeX using OpenAI with Gemini fallback
  async optimizeResumeAndGenerateLatex(resumeText, jobDescription) {
    if (!resumeText || !jobDescription) {
      throw new Error('Resume text and job description are required');
    }

    // First extract the name
    const name = await this.extractNameFromResume(resumeText);
    console.log('Extracted name:', name);

    const prompt = `You are an expert resume optimizer and LaTeX code generator. Your task is to analyze the provided unoptimized resume and the job description, then generate the full, professional, and optimized LaTeX code for a resume.

1. **Name Recognition:** The candidate's name is: ${name}. Place this name prominently at the TOP CENTER of the resume.

2. **Optimization:** Identify key skills and requirements from the Job Description. Rewrite the resume's experience bullet points to strongly align with job keywords, using powerful action verbs and quantifying achievements (metrics, results) where possible. Maintain a clean, professional structure (Contact, Summary/Objective, Experience, Education, Skills).

3. **LaTeX Output:** The final output MUST be ONLY the raw, complete, and compilable LaTeX code for a single document.

4. **Formatting Requirements:** 
   - Use a standard, simple, modern resume template based on the 'article' document class
   - Place "${name}" at the TOP CENTER in large, bold font (\\Large or \\LARGE)
   - Contact information should be centered below the name
   - Use clean section headers with horizontal rules
   - Ensure the document is ATS-friendly
   - Do NOT include any explanatory text, markdown code wrappers (like \`\`\`latex), or comments outside the LaTeX environment
   - The first character of your response must be '\\' (backslash) to start the LaTeX document

Target Job Description:
---
${jobDescription}
---

Unoptimized Resume Text:
---
${resumeText}
---`;

    // Try Gemini first (preferred for resume optimization)
    if (this.geminiApiKey) {
      try {
        console.log('Attempting LaTeX generation with Gemini...');
        const generatedLatex = await this.callGeminiAPI(prompt);
        console.log('Gemini LaTeX generation successful');
        
        // Ensure name is at top center if not already
        let finalLatex = generatedLatex;
        if (!finalLatex.includes('\\begin{center}') && !finalLatex.includes(name)) {
          // Inject name at top if missing
          finalLatex = finalLatex.replace(/\\begin{document}/, 
            `\\begin{document}\n\\begin{center}\n{\\LARGE \\textbf{${this.escapeLatex(name)}}}\\\\[0.5em]\n\\end{center}\n`);
        }
        
        return finalLatex;
      } catch (error) {
        console.warn('Gemini LaTeX generation failed, attempting OpenAI fallback:', error.message);
      }
    }

    // Fallback to OpenAI
    if (this.checkAvailability()) {
      try {
        console.log('Attempting LaTeX generation with OpenAI...');
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.4
        });

        const generatedLatex = response.choices[0].message.content.trim();
        console.log('OpenAI LaTeX generation successful');
        return generatedLatex;
      } catch (error) {
        console.error('OpenAI LaTeX generation failed:', error.message);
      }
    }

    throw new Error('All AI services are currently unavailable. Please check your API keys and billing status.');
  }
}

// Create singleton instance
const aiService = new AIService();

// Initialize function
export const initializeAIServices = async () => {
  return await aiService.initialize();
};

// Check if AI service is available
export const isAIServiceAvailable = () => {
  return aiService.isAvailable;
};

export default aiService;
