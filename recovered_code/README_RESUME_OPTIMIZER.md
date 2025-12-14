# AI Resume Optimizer

## Overview

The AI Resume Optimizer is a powerful feature that uses the Gemini API to optimize resumes, extract candidate names, and generate professional LaTeX-formatted resumes with downloadable PDFs.

## Features

### 1. **Text Optimization**

- AI-powered resume text optimization using Gemini API
- Automatic name extraction and recognition
- Job description alignment
- Action verb enhancement
- Quantifiable achievement suggestions
- **No resume ID required - completely standalone**

### 2. **Name Recognition**

- Automatically extracts the candidate's name from resume text
- Places the name prominently at the **TOP CENTER** of the generated LaTeX document
- Displays extracted name in the UI for verification

### 3. **LaTeX Generation**

- Professional LaTeX template generation
- Name positioned at top center in large, bold font
- Clean, ATS-friendly formatting
- Centered contact information below name
- Professional section headers with horizontal rules
- **Standalone generation - no database required**

### 4. **PDF Compilation**

- Server-side PDF compilation (if pdflatex is available)
- Automatic PDF preview after compilation
- Downloadable PDF with optimized resume
- **Simplified endpoint without resume IDs**

### 5. **Multiple Download Options**

- Download optimized text (.txt)
- Download LaTeX source (.tex)
- Download compiled PDF (.pdf)

## How It Works

### Frontend Flow

1. User pastes resume text into the input textarea
2. (Optional) User provides job description for targeted optimization
3. User clicks "Optimize Resume" to optimize text
4. User clicks "Generate LaTeX" to create professional LaTeX code
5. PDF is automatically compiled and previewed
6. User can download in any format (text, LaTeX, PDF)

### Backend Flow

#### Text Optimization (`/api/resumes/optimize-text`)

```javascript
POST /api/resumes/optimize-text
{
  "resumeText": "Your resume text...",
  "jobDescription": "Target job description..." // optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "optimizedText": "Optimized resume content...",
    "improvements": ["List of improvements made"]
  }
}
```

#### LaTeX Generation (`/api/resumes/optimize-latex`)

```javascript
POST /api/resumes/optimize-latex
{
  "resumeText": "Your resume text...",
  "jobDescription": "Target job description..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "latex": "\\documentclass{article}..."
  }
}
```

#### PDF Compilation (`/api/resumes/compile-latex`)

**Note:** This endpoint does NOT require a resume ID - it's completely standalone!

```javascript
POST /api/resumes/compile-latex
{
  "latexContent": "\\documentclass{article}..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "base64Pdf": "JVBERi0xLjQKJ..."
  }
}
```

**Important:** No authentication or resume ID required - this is a public endpoint for PDF compilation.

## AI Service Functions

### `extractNameFromResume(resumeText)`

Extracts the candidate's full name from resume text using Gemini API.

### `optimizeResumeText(resumeText, jobDescription)`

Optimizes resume text with:

- Name extraction
- Bullet point enhancement
- Keyword alignment
- Achievement quantification

**Returns:**

```javascript
{
  name: "Candidate Name",
  optimizedText: "Optimized resume...",
  improvements: ["improvement1", "improvement2"]
}
```

### `optimizeResumeAndGenerateLatex(resumeText, jobDescription)`

Combines optimization with LaTeX generation:

1. Extracts candidate name
2. Creates optimization prompt with name positioning instructions
3. Generates complete LaTeX document with name at top center
4. Returns compilable LaTeX code

## Template Structure

The generated LaTeX follows this structure:

```latex
\documentclass{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage{hyperref}

\begin{document}

% Name at TOP CENTER - LARGE and BOLD
\begin{center}
{\LARGE \textbf{John Doe}}\\[0.5em]
\end{center}

% Contact Information (Centered)
\begin{center}
email@example.com | (555) 123-4567 | linkedin.com/in/profile
\end{center}

% Professional Summary
\section*{Professional Summary}
...

% Experience
\section*{Experience}
...

% Education
\section*{Education}
...

% Skills
\section*{Skills}
...

\end{document}
```

## Configuration

### Backend Environment Variables

Ensure your `.env` file includes:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI (Fallback)
OPENAI_API_KEY=your_openai_key_here

# AI Service Configuration
AI_MAX_TOKENS=4000
AI_MAX_RETRIES=3
AI_SERVICE_TIMEOUT=30000
```

### LaTeX Compilation (Optional)

For PDF compilation to work, the server needs `pdflatex` installed:

**Ubuntu/Debian:**

```bash
sudo apt-get install texlive-latex-base texlive-latex-extra
```

**macOS:**

```bash
brew install --cask mactex
```

**Windows:**
Download and install MiKTeX or TeX Live

**Note:** If pdflatex is not available, users can still download the LaTeX source and compile locally.

## Usage Examples

### Basic Optimization

```typescript
// Optimize resume without job description
const response = await api.post("/resumes/optimize-text", {
  resumeText: "John Doe\nSoftware Engineer...",
});

console.log(response.data.data.name); // "John Doe"
console.log(response.data.data.optimizedText); // Optimized content
```

### Job-Targeted Optimization

```typescript
// Optimize for specific job
const response = await api.post("/resumes/optimize-latex", {
  resumeText: "John Doe\nSoftware Engineer...",
  jobDescription: "Senior Full Stack Developer position...",
});

// LaTeX with name at top center
const latex = response.data.data.latex;
```

### Complete Workflow

```typescript
// 1. Optimize text
const optimized = await api.post("/resumes/optimize-text", {
  resumeText,
  jobDescription,
});

// 2. Generate LaTeX
const latexResponse = await api.post("/resumes/optimize-latex", {
  resumeText: optimized.data.data.optimizedText,
  jobDescription,
});

// 3. Compile to PDF
const pdfResponse = await api.post("/resumes/compile-latex", {
  latexContent: latexResponse.data.data.latex,
});

// 4. Download PDF
const pdfData = pdfResponse.data.data.base64Pdf;
downloadPdf(pdfData);
```

## UI Components

### ResumeOptimizer Component

Location: `src/components/ResumeOptimizer.tsx`

**Features:**

- Tabbed interface (Input, Optimized, LaTeX, Preview)
- Name recognition display
- Improvements list
- Multiple download options
- Real-time status messages
- Loading states for all operations

**Usage:**

```typescript
import ResumeOptimizer from "@/components/ResumeOptimizer";

function App() {
  return <ResumeOptimizer />;
}
```

### Routing

The optimizer is available at `/resume-optimizer`:

```typescript
<Route path="/resume-optimizer" element={<ResumeOptimizer />} />
```

### Dashboard Integration

A card in the Dashboard provides quick access:

```typescript
<Button onClick={() => (window.location.href = "/resume-optimizer")}>
  Optimize Resume with AI
</Button>
```

## Error Handling

### AI Service Unavailable

If both Gemini and OpenAI are unavailable:

```json
{
  "success": false,
  "error": "All AI services are currently unavailable. Please check your API keys and billing status."
}
```

### PDF Compilation Failed

If pdflatex is not available:

```json
{
  "success": false,
  "error": "LaTeX compilation is not available on this server. Please download the LaTeX code and compile it locally.",
  "data": {
    "latexContent": "\\documentclass..."
  }
}
```

### Name Extraction Fallback

If name extraction fails, falls back to:

1. First line of resume text
2. "Your Name" placeholder

## Best Practices

1. **Input Quality**: Provide clean, well-formatted resume text for best results
2. **Job Descriptions**: Include detailed job descriptions for targeted optimization
3. **Review Output**: Always review AI-generated content before using
4. **Edit LaTeX**: The LaTeX code is editable - make manual adjustments as needed
5. **Local Compilation**: If server PDF compilation fails, compile LaTeX locally

## Troubleshooting

### "Name not recognized correctly"

- Ensure the name is at the beginning of the resume text
- Manually edit the LaTeX to correct the name placement
- Check the extracted name display in the UI

### "LaTeX won't compile"

- Check for special characters that need escaping
- Verify all LaTeX packages are available
- Try downloading and compiling locally with a full TeX distribution

### "Optimization seems generic"

- Provide a detailed job description
- Ensure resume text is comprehensive
- Try optimizing multiple times with refined job descriptions

## Future Enhancements

- [ ] Multiple template styles (Modern, Classic, ATS-focused)
- [ ] Custom name placement options
- [ ] Section reordering
- [ ] Skills extraction and categorization
- [ ] Achievement quantification suggestions
- [ ] Multi-column layouts
- [ ] Color scheme customization
- [ ] Export to other formats (Markdown, HTML)

## API Rate Limits

Be aware of Gemini API rate limits:

- Free tier: 60 requests per minute
- Paid tier: Higher limits based on plan

Consider implementing rate limiting on the frontend for production use.

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Validate and sanitize all user input
- Implement rate limiting to prevent abuse
- Consider adding user authentication for production

## Support

For issues or questions:

1. Check error messages in browser console
2. Review backend logs for API errors
3. Verify environment variables are set correctly
4. Ensure Gemini API key has sufficient quota
5. Test with sample resume text first
