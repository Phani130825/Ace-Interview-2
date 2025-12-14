# Resume Tailoring Workflow Update

## Current Workflow

1. Resume text input
2. Job description input
3. "Tailor Resume" button (calls tailor API)
4. Template selection
5. LaTeX generation/PDF

## New Workflow

1. Resume text input
2. Job description input
3. Template selection (4+ templates)
4. "Optimize Resume" button (uses selected template's boilerplate + APIs to generate LaTeX/PDF)

## Tasks

- [x] Move template selection before optimize button in UI
- [x] Change "Tailor Resume" button to "Optimize Resume"
- [x] Update optimize button logic to use selected template and call optimize-latex API
- [x] Ensure at least 4 templates are available (professional, modern, creative, executive)
- [x] Test the new workflow (MiKTeX installed and pdflatex available)
