#!/bin/bash
# Quick validation script for refactored Gemini agents

echo "🔍 Validating Gemini Agent Refactoring..."
echo ""

# Check for any remaining OpenAI imports
echo "✓ Checking for OpenAI imports..."
if grep -r "import OpenAI" backend/services/{interviewerAgent,codingEvaluatorAgent,hrBehaviorAgent}.js 2>/dev/null; then
  echo "  ❌ Found OpenAI imports - refactoring incomplete!"
  exit 1
else
  echo "  ✅ No OpenAI imports found"
fi

# Check for Gemini API setup
echo ""
echo "✓ Checking for Gemini API configuration..."
if grep -q "geminiUrl.*gemini-2.5-flash" backend/services/interviewerAgent.js && \
   grep -q "geminiUrl.*gemini-2.5-flash" backend/services/codingEvaluatorAgent.js && \
   grep -q "geminiUrl.*gemini-2.5-flash" backend/services/hrBehaviorAgent.js; then
  echo "  ✅ All agents configured for Gemini API"
else
  echo "  ❌ Gemini configuration incomplete!"
  exit 1
fi

# Check for API call helper methods
echo ""
echo "✓ Checking for callGeminiAPI helper methods..."
if grep -q "async callGeminiAPI" backend/services/interviewerAgent.js && \
   grep -q "async callGeminiAPI" backend/services/codingEvaluatorAgent.js && \
   grep -q "async callGeminiAPI" backend/services/hrBehaviorAgent.js; then
  echo "  ✅ All agents have callGeminiAPI methods"
else
  echo "  ❌ callGeminiAPI methods missing!"
  exit 1
fi

# Check for JSON cleaning helper
echo ""
echo "✓ Checking for JSON cleaning helper..."
if grep -q "cleanJSON(text)" backend/services/interviewerAgent.js && \
   grep -q "cleanJSON(text)" backend/services/codingEvaluatorAgent.js && \
   grep -q "cleanJSON(text)" backend/services/hrBehaviorAgent.js; then
  echo "  ✅ All agents have cleanJSON helper"
else
  echo "  ❌ cleanJSON helper missing!"
  exit 1
fi

# Check axios usage
echo ""
echo "✓ Checking for axios usage..."
if grep -q "axios.post" backend/services/interviewerAgent.js && \
   grep -q "axios.post" backend/services/codingEvaluatorAgent.js && \
   grep -q "axios.post" backend/services/hrBehaviorAgent.js; then
  echo "  ✅ All agents using axios for API calls"
else
  echo "  ❌ axios not properly integrated!"
  exit 1
fi

# Verify dependencies
echo ""
echo "✓ Checking dependencies..."
if npm list axios dotenv &>/dev/null; then
  echo "  ✅ axios and dotenv installed"
else
  echo "  ❌ Dependencies not found!"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ All Gemini refactoring checks passed!"
echo "═══════════════════════════════════════"
echo ""
echo "Ready to test with:"
echo "  npm run dev"
echo ""
