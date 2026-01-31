/**
 * WebSocket Handler for Group Discussions - Socket.io
 * Manages real-time communication for group discussion sessions
 */

import GroupDiscussionAgentService from '../services/groupDiscussionAgent.js';

// Store active discussion rooms
const discussionRooms = new Map();

/**
 * Initialize WebSocket handlers for group discussions
 * @param {Server} io - Socket.io server instance
 */
export function initializeGroupDiscussionSocket(io) {
  const discussionNamespace = io.of('/discussions');

  discussionNamespace.on('connection', (socket) => {
    console.log(`User connected to discussions: ${socket.id}`);

    /**
     * JOIN_DISCUSSION - User joins a discussion room
     */
    socket.on('join_discussion', async (data) => {
      try {
        const { sessionId, topic, selectedAgents = null, context = {} } = data;
        
        // Create or get discussion room
        let room = discussionRooms.get(sessionId);
        if (!room) {
          const agentService = new GroupDiscussionAgentService();
          const initResult = await agentService.initializeDiscussion(
            topic,
            selectedAgents,
            context
          );

          room = {
            sessionId,
            agentService,
            participants: [],
            createdAt: new Date(),
            topic
          };
          discussionRooms.set(sessionId, room);
        }

        // Add participant to room
        socket.join(sessionId);
        room.participants.push({
          socketId: socket.id,
          userId: data.userId,
          joinedAt: new Date()
        });

        // Notify others that user joined
        discussionNamespace.to(sessionId).emit('user_joined', {
          userId: data.userId,
          participantCount: room.participants.length
        });

        // Send opening statement to joiner
        socket.emit('discussion_initialized', {
          sessionId,
          topic: room.topic,
          participants: room.participants,
          openingStatement: room.agentService.conversationHistory[0]?.message
        });

        console.log(`User ${data.userId} joined discussion ${sessionId}`);
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to join discussion',
          error: error.message
        });
      }
    });

    /**
     * USER_MESSAGE - User sends a message to the discussion
     */
    socket.on('user_message', async (data) => {
      try {
        const { sessionId, message, focusAgent = null } = data;
        const room = discussionRooms.get(sessionId);

        if (!room) {
          socket.emit('error', { message: 'Discussion room not found' });
          return;
        }

        // Process message and get agent responses
        const result = await room.agentService.processUserInput(message, focusAgent);

        // Broadcast user message
        discussionNamespace.to(sessionId).emit('new_message', {
          agent: 'user',
          message,
          timestamp: new Date(),
          type: 'user_input'
        });

        // Broadcast agent responses
        for (const agentResponse of result.agentResponses) {
          discussionNamespace.to(sessionId).emit('agent_response', {
            agent: agentResponse.agent,
            name: agentResponse.name,
            role: agentResponse.role,
            message: agentResponse.message,
            timestamp: agentResponse.timestamp
          });
        }

        // Emit progress update
        discussionNamespace.to(sessionId).emit('discussion_progress', {
          progress: result.discussionProgress
        });

      } catch (error) {
        socket.emit('error', {
          message: 'Failed to process message',
          error: error.message
        });
      }
    });

    /**
     * ASK_AGENT - User asks a specific agent
     */
    socket.on('ask_agent', async (data) => {
      try {
        const { sessionId, agentType, question } = data;
        const room = discussionRooms.get(sessionId);

        if (!room) {
          socket.emit('error', { message: 'Discussion room not found' });
          return;
        }

        // Get agent response
        const response = await room.agentService.askSpecificAgent(agentType, question);

        // Broadcast the question
        discussionNamespace.to(sessionId).emit('direct_question', {
          agent: agentType,
          question
        });

        // Broadcast agent's response
        discussionNamespace.to(sessionId).emit('direct_answer', {
          agent: response.agent,
          name: response.name,
          message: response.message,
          timestamp: response.timestamp
        });

      } catch (error) {
        socket.emit('error', {
          message: 'Failed to ask agent',
          error: error.message
        });
      }
    });

    /**
     * REQUEST_CONSENSUS - Analyze current consensus
     */
    socket.on('request_consensus', async (data) => {
      try {
        const { sessionId } = data;
        const room = discussionRooms.get(sessionId);

        if (!room) {
          socket.emit('error', { message: 'Discussion room not found' });
          return;
        }

        const analysis = await room.agentService.analyzeConsensus();

        discussionNamespace.to(sessionId).emit('consensus_analysis', {
          analysis: analysis.analysis
        });

      } catch (error) {
        socket.emit('error', {
          message: 'Failed to analyze consensus',
          error: error.message
        });
      }
    });

    /**
     * REQUEST_SUMMARY - Generate discussion summary
     */
    socket.on('request_summary', async (data) => {
      try {
        const { sessionId } = data;
        const room = discussionRooms.get(sessionId);

        if (!room) {
          socket.emit('error', { message: 'Discussion room not found' });
          return;
        }

        const summary = await room.agentService.generateSummary();

        discussionNamespace.to(sessionId).emit('discussion_summary', {
          summary: summary.summary,
          metrics: summary.discussionMetadata
        });

      } catch (error) {
        socket.emit('error', {
          message: 'Failed to generate summary',
          error: error.message
        });
      }
    });

    /**
     * END_DISCUSSION - End the discussion and get final report
     */
    socket.on('end_discussion', async (data) => {
      try {
        const { sessionId } = data;
        const room = discussionRooms.get(sessionId);

        if (!room) {
          socket.emit('error', { message: 'Discussion room not found' });
          return;
        }

        const finalReport = await room.agentService.endDiscussion();

        // Broadcast final report to all participants
        discussionNamespace.to(sessionId).emit('discussion_ended', {
          finalReport
        });

        // Clean up room
        discussionRooms.delete(sessionId);

        // Leave room
        socket.leave(sessionId);

      } catch (error) {
        socket.emit('error', {
          message: 'Failed to end discussion',
          error: error.message
        });
      }
    });

    /**
     * REQUEST_AGENT_LIST - Get available agents
     */
    socket.on('request_agent_list', (data) => {
      try {
        const agents = GroupDiscussionAgentService.getAvailableAgents();
        socket.emit('agent_list', { agents });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to get agent list',
          error: error.message
        });
      }
    });

    /**
     * TYPING_INDICATOR - User is typing
     */
    socket.on('typing', (data) => {
      const { sessionId, userId } = data;
      discussionNamespace.to(sessionId).emit('user_typing', {
        userId,
        timestamp: new Date()
      });
    });

    /**
     * STOP_TYPING - User stopped typing
     */
    socket.on('stop_typing', (data) => {
      const { sessionId, userId } = data;
      discussionNamespace.to(sessionId).emit('user_stopped_typing', {
        userId,
        timestamp: new Date()
      });
    });

    /**
     * DISCONNECT - User disconnects
     */
    socket.on('disconnect', () => {
      // Clean up from all rooms
      for (const [sessionId, room] of discussionRooms.entries()) {
        const index = room.participants.findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          room.participants.splice(index, 1);
          
          // Notify others
          discussionNamespace.to(sessionId).emit('user_left', {
            participantCount: room.participants.length
          });

          // Delete room if empty
          if (room.participants.length === 0) {
            discussionRooms.delete(sessionId);
          }
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  console.log('WebSocket discussion handlers initialized');
}

/**
 * Get active discussions count
 */
export function getActiveDiscussionsCount() {
  return discussionRooms.size;
}

/**
 * Get discussion room info
 */
export function getDiscussionRoomInfo(sessionId) {
  return discussionRooms.get(sessionId);
}

export default initializeGroupDiscussionSocket;
