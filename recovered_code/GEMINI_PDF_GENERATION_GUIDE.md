# Gemini API Resume Optimization & PDF Generation Guide

## 🎯 Overview

The Resume Optimizer now uses **Gemini API directly** to analyze and structure resume content into a JSON format, which is then used to generate professional PDFs.

## 🔄 How It Works

### 1. **Gemini API Integration**

- **Frontend Direct Call**: The component calls Gemini API directly from the browser
- **API Key**: Uses `VITE_GEMINI_API_KEY` from environment variables
- **Model**: `gemini-pro` via Google's Generative Language API

### 2. **Optimization Flow**

```
User Input (Resume Text + Job Description)
           ↓
   Gemini API Call
           ↓
   Structured JSON Response
   {
     name, email, phone, location, linkedin,
     objective,
     experience: [{title, company, duration, achievements}],
     education: [{degree, institution, year, details}],
     skills: [],
     projects: [{name, description, technologies, achievements}],
     achievements: []
   }
           ↓
   PDF Generation with jsPDF
           ↓
   Download Resume (Modern/Professional/Classic/Creative)
```

### 3. **JSON Structure**

Gemini API returns a structured JSON with the following fields:

```json
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "linkedin": "https://linkedin.com/in/username",
  "objective": "Professional summary optimized for the role",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "achievements": [
        "Achievement 1 with metrics",
        "Achievement 2 with impact"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020",
      "details": "Additional details"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "achievements": ["Achievement 1"]
    }
  ],
  "achievements": ["Achievement 1", "Achievement 2"]
}
```

## 🎨 PDF Templates

4 professional templates available:

### 1. **Modern** (Blue Theme)

- Primary Color: #2980B9
- Accent: #3498DB
- Use case: Tech roles, startups

### 2. **Professional** (Gray Theme)

- Primary Color: #2C3E50
- Accent: #7F8C8D
- Use case: Corporate roles, consulting

### 3. **Classic** (Black & White)

- Primary Color: #000000
- Accent: #646464
- Use case: Traditional industries, law, finance

### 4. **Creative** (Orange Theme)

- Primary Color: #E67E22
- Accent: #F1C40F
- Use case: Design, marketing, creative roles

## 📝 Key Features

### ✅ **Name Recognition**

- Gemini extracts the candidate's name automatically
- Name is placed at the **top center** of the PDF (as per template requirement)

### ✅ **Contact Information**

- Email, phone, location, LinkedIn displayed in a single line below name
- Format: `email | phone | location | linkedin`

### ✅ **ATS Optimization**

- Content optimized for Applicant Tracking Systems
- Action verbs and quantifiable metrics
- Keyword alignment with job description

### ✅ **Smart Formatting**

- Automatic page breaks
- Consistent spacing
- Professional typography
- Bullet points for achievements

## 🚀 Usage

### Step 1: Enter Resume Text

```
Paste your existing resume content in the "Resume Input" tab
```

### Step 2: Add Job Description (Optional)

```
Add the target job description for role-specific optimization
```

### Step 3: Optimize with Gemini

```
Click "Optimize with Gemini AI" button
- Wait for API response
- Review optimized content in "Optimized Text" tab
```

### Step 4: Generate PDF

```
Go to "PDF Templates" tab
- Select template (Modern/Professional/Classic/Creative)
- Click "Generate PDF with [Template]"
- PDF downloads automatically
```

## ⚙️ Configuration

### Environment Variables (.env)

```env
VITE_GEMINI_API_KEY=AIzaSyBusTBKo-BxbyQ2Fsg0nNkg3uSV1yukavY
```

### API Endpoint

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

### Generation Config

```javascript
{
  temperature: 0.4,      // Lower = more focused
  topK: 32,              // Diversity control
  topP: 1,               // Cumulative probability
  maxOutputTokens: 4096  // Max response length
}
```

## 🐛 Troubleshooting

### Issue: PDF is 0 bytes

**Solution**: Make sure to click "Optimize with Gemini AI" first before generating PDF

### Issue: "Gemini API key not configured"

**Solution**: Check `.env` file has `VITE_GEMINI_API_KEY` set

### Issue: "Please optimize your resume with Gemini first"

**Solution**: The PDF generator needs structured data from Gemini. Click optimize button first.

### Issue: JSON parsing error

**Solution**: Gemini sometimes returns JSON wrapped in markdown. The code strips this automatically, but if it fails, try again.

## 📊 Benefits Over Previous Approach

| Feature             | Old (parseResumeText) | New (Gemini API)   |
| ------------------- | --------------------- | ------------------ |
| **Accuracy**        | Regex-based (brittle) | AI-powered (smart) |
| **Name Extraction** | Manual regex          | Automatic          |
| **Structure**       | Basic sections        | Rich hierarchy     |
| **Optimization**    | None                  | Job-aligned        |
| **ATS Friendly**    | No                    | Yes                |
| **PDF Quality**     | Empty/broken          | Professional       |

## 🔐 Security Notes

- API key is stored in environment variables (not in code)
- API calls are made from frontend (no backend secrets exposed)
- No resume data is stored on servers
- All processing happens client-side after Gemini response

## 📚 Code References

### Main Functions:

1. **`optimizeWithGemini()`** - Line ~56

   - Calls Gemini API
   - Returns structured JSON

2. **`optimizeResume()`** - Line ~169

   - Orchestrates optimization
   - Stores structured data
   - Creates text representation

3. **`generatePdfWithTemplate()`** - Line ~372
   - Uses structured resume data
   - Generates PDF with jsPDF
   - Applies template styling

## 🎓 Next Steps

1. Test with various resume formats
2. Validate all 4 templates
3. Check PDF file sizes are non-zero
4. Verify name appears at top center
5. Ensure all sections render correctly
