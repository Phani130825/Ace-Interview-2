/**
 * Group Discussion Agent Service - Phase 3
 * Multi-agent conversation system for group discussions
 * Supports multiple AI personalities, real-time coordination, and dynamic interactions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiRateLimiter } from './rateLimiter.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agent personality definitions
 * Each agent has unique traits, expertise, and communication style
 */
const AGENT_PERSONALITIES = {
  facilitator: {
    name: 'Alex (Facilitator)',
    role: 'Group Discussion Moderator',
    expertise: 'Leadership, Time Management, Conflict Resolution',
    style: 'Encouraging, Organized, Fair',
    systemPrompt: `You are Alex, the group discussion facilitator. Your role is to:
    - Keep the discussion focused and on track
    - Ensure all team members participate equally
    - Summarize key points periodically
    - Ask clarifying questions
    - Manage time effectively
    - Encourage constructive debate
    - Use phrases like "Great point!", "Let's hear from others", "Let's summarize what we've discussed"
    Maintain a professional, encouraging tone.`
  },
  
  analyst: {
    name: 'Jordan (Analyst)',
    role: 'Data & Logic Analyst',
    expertise: 'Data Analysis, Logic, Problem Solving',
    style: 'Detail-oriented, Logical, Precise',
    systemPrompt: `You are Jordan, the analytical thinker. Your role is to:
    - Break down complex problems into components
    - Ask for data and evidence
    - Challenge assumptions with logic
    - Provide numerical analysis when relevant
    - Point out potential flaws in reasoning
    - Focus on facts and measurable outcomes
    - Use phrases like "Let me analyze this", "The data shows", "From a logical perspective"
    Be precise and evidence-based in your responses.`
  },
  
  creative: {
    name: 'Morgan (Creative)',
    role: 'Innovation & Strategy Lead',
    expertise: 'Innovation, Strategy, Out-of-the-box Thinking',
    style: 'Visionary, Enthusiastic, Unconventional',
    systemPrompt: `You are Morgan, the creative strategist. Your role is to:
    - Propose innovative solutions
    - Think outside conventional boundaries
    - Envision future possibilities
    - Challenge status quo
    - Suggest novel approaches
    - Connect seemingly unrelated ideas
    - Use phrases like "What if we...", "Imagine a scenario where...", "Here's a bold idea"
    Be imaginative and forward-thinking in your responses.`
  },
  
  pragmatist: {
    name: 'Casey (Pragmatist)',
    role: 'Implementation & Feasibility Expert',
    expertise: 'Practical Implementation, Risk Management, Resources',
    style: 'Practical, Realistic, Grounded',
    systemPrompt: `You are Casey, the pragmatic implementer. Your role is to:
    - Assess practical feasibility
    - Identify potential obstacles
    - Consider resource requirements
    - Propose realistic timelines
    - Highlight risks and mitigation strategies
    - Focus on actionable steps
    - Use phrases like "In practice", "We need to consider", "The real challenge is", "Let's be realistic"
    Be practical and grounded in reality.`
  },

  devil_advocate: {
    name: 'Riley (Devil\'s Advocate)',
    role: 'Critical Evaluator',
    expertise: 'Critical Thinking, Risk Assessment, Alternative Perspectives',
    style: 'Challenging, Skeptical, Thorough',
    systemPrompt: `You are Riley, the critical evaluator. Your role is to:
    - Question all assumptions
    - Propose alternative viewpoints
    - Identify weaknesses in arguments
    - Challenge ideas constructively
    - Ask tough questions
    - Consider worst-case scenarios
    - Use phrases like "But what about...", "Have we considered...", "The risk here is", "Let me challenge this"
    Be constructively critical and thorough in analysis.`
  }
};

/**
 * Group Discussion Agent Service
 * Manages multi-agent conversations with coordination and personality system
 */
export class GroupDiscussionAgentService {
  constructor() {
    this.conversationHistory = [];
    this.agentStates = {};
    this.discussionMetadata = {
      startTime: null,
      totalTurns: 0,
      activeTopic: null,
      participationScores: {}
    };
    this.initializeAgentStates();
  }

  /**
   * Initialize state for each agent
   */
  initializeAgentStates() {
    Object.keys(AGENT_PERSONALITIES).forEach(agentType => {
      this.agentStates[agentType] = {
        lastSpokeAt: 0,
        responseCount: 0,
        isThinking: false,
        lastResponse: '',
        expertise: AGENT_PERSONALITIES[agentType].expertise
      };
    });
  }

  /**
   * Start a new group discussion session
   * @param {string} topic - The discussion topic
   * @param {array} selectedAgents - Which agents to include
   * @param {object} context - Background context for discussion
   * @returns {Promise<object>} - Session initialization response
   */
  async initializeDiscussion(topic, selectedAgents = Object.keys(AGENT_PERSONALITIES), context = {}) {
    try {
      this.conversationHistory = [];
      this.discussionMetadata = {
        startTime: new Date(),
        totalTurns: 0,
        activeTopic: topic,
        participationScores: {},
        selectedAgents
      };

      // Initialize participation scores
      selectedAgents.forEach(agent => {
        this.discussionMetadata.participationScores[agent] = {
          responseCount: 0,
          averageLength: 0,
          engagementScore: 0
        };
      });

      // Generate opening statement from facilitator
      const facilitatorPrompt = `You are starting a group discussion on the topic: "${topic}"
      
Context: ${JSON.stringify(context)}

As the facilitator, provide a brief, engaging opening statement (2-3 sentences) that:
1. Clearly states the discussion topic
2. Explains why it's important
3. Encourages participation

Keep it concise and professional.`;

      // Use rate limiter for opening statement generation
      const openingStatement = await geminiRateLimiter.add(
        async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const response = await model.generateContent(facilitatorPrompt);
          return response.response.text();
        },
        `opening_${Date.now()}`
      );

      this.conversationHistory.push({
        agent: 'facilitator',
        role: AGENT_PERSONALITIES.facilitator.name,
        message: openingStatement,
        timestamp: new Date(),
        type: 'opening'
      });

      return {
        success: true,
        sessionId: Date.now().toString(),
        topic,
        selectedAgents: Array.isArray(selectedAgents) ? selectedAgents : Object.keys(AGENT_PERSONALITIES),
        selectedAgentsInfo: selectedAgents.map(a => ({
          type: a,
          name: AGENT_PERSONALITIES[a].name,
          role: AGENT_PERSONALITIES[a].role
        })),
        openingStatement,
        discussionMetadata: this.discussionMetadata
      };
    } catch (error) {
      console.error('Error initializing discussion:', error);
      throw error;
    }
  }

  /**
   * Process a user input and get coordinated agent responses
   * @param {string} userMessage - User's contribution to discussion
   * @param {string} focusAgent - Which agent to focus on (optional)
   * @returns {Promise<object>} - Coordinated agent responses
   */
  async processUserInput(userMessage, focusAgent = null) {
    try {
      // Add user message to history
      this.conversationHistory.push({
        agent: 'user',
        message: userMessage,
        timestamp: new Date(),
        type: 'user_input'
      });

      this.discussionMetadata.totalTurns++;

      // Determine which agents should respond
      const respondingAgents = focusAgent 
        ? [focusAgent]
        : this.selectRespondingAgents(this.discussionMetadata.selectedAgents);

      // Get coordinated responses from agents using rate limiter
      const responses = await Promise.all(
        respondingAgents.map(agentType => 
          geminiRateLimiter.add(
            () => this.generateAgentResponse(agentType, userMessage),
            `agent_${agentType}_${Date.now()}`
          )
        )
      );

      return {
        success: true,
        userMessage,
        agentResponses: responses,
        discussionProgress: this.getDiscussionProgress()
      };
    } catch (error) {
      console.error('Error processing user input:', error);
      throw error;
    }
  }

  /**
   * Select which agents should respond next
   * Uses rotation to ensure all agents participate
   * @returns {array} - Array of agent types that should respond
   */
  selectRespondingAgents(selectedAgents) {
    // Return 2-3 agents based on participation balance
    const agentScores = selectedAgents.map(agent => ({
      agent,
      score: this.discussionMetadata.participationScores[agent]?.responseCount || 0
    })).sort((a, b) => a.score - b.score);

    // Return the 2-3 least-spoken agents
    return agentScores.slice(0, Math.min(3, agentScores.length)).map(a => a.agent);
  }

  /**
   * Generate a response from a specific agent
   * @param {string} agentType - Agent type (personality)
   * @param {string} userMessage - The user's message to respond to
   * @returns {Promise<object>} - Agent's response
   */
  async generateAgentResponse(agentType, userMessage) {
    try {
      const personality = AGENT_PERSONALITIES[agentType];
      
      // Build context from conversation history
      const conversationContext = this.buildConversationContext();

      const prompt = `${personality.systemPrompt}

Current discussion topic: "${this.discussionMetadata.activeTopic}"

Recent conversation:
${conversationContext}

User just said: "${userMessage}"

Now, respond from ${personality.name}'s perspective. Your response should:
1. Be relevant to the topic and user's message
2. Reflect your expertise (${personality.expertise})
3. Be professional and respectful
4. Be concise (2-3 sentences typically)
5. Add unique value to the discussion

Keep your response focused and avoid repetition of previous points.`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      const agentMessage = response.response.text();

      // Update agent state
      this.agentStates[agentType].lastSpokeAt = Date.now();
      this.agentStates[agentType].responseCount++;
      this.agentStates[agentType].lastResponse = agentMessage;

      // Update participation score
      this.discussionMetadata.participationScores[agentType].responseCount++;
      this.discussionMetadata.participationScores[agentType].averageLength = 
        (this.discussionMetadata.participationScores[agentType].averageLength + agentMessage.length) / 2;

      // Add to history
      this.conversationHistory.push({
        agent: agentType,
        role: personality.name,
        message: agentMessage,
        timestamp: new Date(),
        type: 'agent_response'
      });

      return {
        agent: agentType,
        name: personality.name,
        role: personality.role,
        message: agentMessage,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error generating response for ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Ask a specific agent a direct question
   * @param {string} agentType - Which agent to question
   * @param {string} question - The question to ask
   * @returns {Promise<object>} - Agent's response
   */
  async askSpecificAgent(agentType, question) {
    try {
      const personality = AGENT_PERSONALITIES[agentType];
      
      const prompt = `${personality.systemPrompt}

Discussion topic: "${this.discussionMetadata.activeTopic}"

Someone is asking you directly: "${question}"

Respond thoughtfully from ${personality.name}'s perspective, using your expertise in ${personality.expertise}.
Keep your response to 2-4 sentences.`;

      // Use rate limiter for single agent query
      const agentMessage = await geminiRateLimiter.add(
        async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const response = await model.generateContent(prompt);
          return response.response.text();
        },
        `directQuestion_${agentType}_${Date.now()}`
      );

      // Update history
      this.conversationHistory.push({
        agent: agentType,
        role: personality.name,
        message: agentMessage,
        timestamp: new Date(),
        type: 'direct_question'
      });

      return {
        agent: agentType,
        name: personality.name,
        message: agentMessage,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error asking ${agentType}:`, error);
      throw error;
    }
  }


  /**
   * Get agreement/disagreement analysis between agents
   * Shows where agents align and where they differ
   * @returns {Promise<object>} - Consensus analysis
   */
  async analyzeConsensus() {
    try {
      const recentMessages = this.conversationHistory.slice(-10);
      const messagesSummary = recentMessages
        .map(m => `${m.role || m.agent}: ${m.message}`)
        .join('\n\n');

      const prompt = `Analyze this group discussion and provide:
1. Areas of consensus (where agents agree)
2. Points of disagreement (where agents differ)
3. Potential compromises or middle grounds
4. Unresolved questions or tensions

Discussion:
${messagesSummary}

Format your response as JSON with keys: "consensus", "disagreements", "compromises", "unresolvedIssues"`;

      // Use rate limiter for consensus analysis
      const responseText = await geminiRateLimiter.add(
        async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const response = await model.generateContent(prompt);
          return response.response.text();
        },
        `consensus_${Date.now()}`
      );
      
      let analysisData;
      try {
        analysisData = JSON.parse(responseText);
      } catch {
        analysisData = {
          raw: responseText
        };
      }

      return {
        success: true,
        analysis: analysisData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error analyzing consensus:', error);
      throw error;
    }
  }

  /**
   * Generate a summary of the discussion so far
   * @returns {Promise<object>} - Discussion summary
   */
  async generateSummary() {
    try {
      const conversationText = this.conversationHistory
        .map(m => `${m.role || m.agent}: ${m.message}`)
        .join('\n\n');

      const prompt = `Summarize this group discussion in the following format:
1. Main Topic: [topic]
2. Key Points Discussed: [bullet points]
3. Areas of Agreement: [bullet points]
4. Areas of Disagreement: [bullet points]
5. Action Items: [bullet points]
6. Next Steps: [bullet points]

Discussion:
${conversationText}`;

      // Use rate limiter for summary generation
      const summary = await geminiRateLimiter.add(
        async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const response = await model.generateContent(prompt);
          return response.response.text();
        },
        `summary_${Date.now()}`
      );

      return {
        success: true,
        summary,
        discussionMetadata: this.discussionMetadata,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Get discussion progress and statistics
   * @returns {object} - Progress metrics
   */
  getDiscussionProgress() {
    const agentStats = {};
    Object.keys(this.discussionMetadata.participationScores).forEach(agent => {
      const stats = this.discussionMetadata.participationScores[agent];
      agentStats[agent] = {
        name: AGENT_PERSONALITIES[agent]?.name || agent,
        responses: stats.responseCount,
        avgLength: Math.round(stats.averageLength),
        engagementScore: (stats.responseCount * stats.averageLength) / 100
      };
    });

    return {
      totalTurns: this.discussionMetadata.totalTurns,
      duration: new Date() - this.discussionMetadata.startTime,
      agentStats,
      topicFocus: this.discussionMetadata.activeTopic
    };
  }

  /**
   * Build conversation context from history
   * @returns {string} - Formatted conversation context
   */
  buildConversationContext() {
    const recent = this.conversationHistory.slice(-8);
    return recent
      .map(m => {
        const speaker = m.role || m.agent || 'Unknown';
        return `${speaker}: ${m.message}`;
      })
      .join('\n\n');
  }

  /**
   * End discussion and get final insights
   * @returns {Promise<object>} - Final discussion report
   */
  async endDiscussion() {
    try {
      const summary = await this.generateSummary();
      const consensus = await this.analyzeConsensus();

      return {
        success: true,
        discussionSummary: summary.summary,
        consensusAnalysis: consensus.analysis,
        finalMetrics: {
          totalTurns: this.discussionMetadata.totalTurns,
          duration: new Date() - this.discussionMetadata.startTime,
          agentParticipation: this.discussionMetadata.participationScores,
          topic: this.discussionMetadata.activeTopic
        },
        conversationHistory: this.conversationHistory,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error ending discussion:', error);
      throw error;
    }
  }

  /**
   * Get available agent personalities
   * @returns {object} - Agent definitions
   */
  static getAvailableAgents() {
    return Object.entries(AGENT_PERSONALITIES).map(([type, personality]) => ({
      type,
      name: personality.name,
      role: personality.role,
      expertise: personality.expertise,
      style: personality.style
    }));
  }
}

export default GroupDiscussionAgentService;
