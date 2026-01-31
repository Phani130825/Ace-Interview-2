/**
 * WebSocket Service for Group Discussions (Frontend)
 * Manages Socket.io connection and real-time communication
 */

import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class DiscussionWebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - Authentication token
   */
  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      namespace: '/discussions',
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to discussions WebSocket');
      this.isConnected = true;
      this.emit('socket_connected', {});
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from discussions WebSocket');
      this.isConnected = false;
      this.emit('socket_disconnected', {});
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('socket_error', error);
    });

    // Register default listeners
    this.registerDefaultListeners();
  }

  /**
   * Register default event listeners
   */
  registerDefaultListeners() {
    this.socket.on('discussion_initialized', (data) => this.emit('discussion_initialized', data));
    this.socket.on('new_message', (data) => this.emit('new_message', data));
    this.socket.on('agent_response', (data) => this.emit('agent_response', data));
    this.socket.on('discussion_progress', (data) => this.emit('discussion_progress', data));
    this.socket.on('direct_question', (data) => this.emit('direct_question', data));
    this.socket.on('direct_answer', (data) => this.emit('direct_answer', data));
    this.socket.on('consensus_analysis', (data) => this.emit('consensus_analysis', data));
    this.socket.on('discussion_summary', (data) => this.emit('discussion_summary', data));
    this.socket.on('discussion_ended', (data) => this.emit('discussion_ended', data));
    this.socket.on('user_joined', (data) => this.emit('user_joined', data));
    this.socket.on('user_left', (data) => this.emit('user_left', data));
    this.socket.on('user_typing', (data) => this.emit('user_typing', data));
    this.socket.on('user_stopped_typing', (data) => this.emit('user_stopped_typing', data));
    this.socket.on('agent_list', (data) => this.emit('agent_list', data));
    this.socket.on('error', (data) => this.emit('socket_error', data));
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Join a discussion room
   * @param {object} data - Session and user info
   */
  joinDiscussion(data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('join_discussion', data);
  }

  /**
   * Send a message to the discussion
   * @param {string} sessionId - Discussion session ID
   * @param {string} message - User's message
   * @param {string} focusAgent - Optional agent to focus on
   */
  sendMessage(sessionId, message, focusAgent = null) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('user_message', {
      sessionId,
      message,
      focusAgent
    });
  }

  /**
   * Ask a specific agent a question
   * @param {string} sessionId - Discussion session ID
   * @param {string} agentType - Agent type to question
   * @param {string} question - Question to ask
   */
  askAgent(sessionId, agentType, question) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('ask_agent', {
      sessionId,
      agentType,
      question
    });
  }

  /**
   * Request consensus analysis
   * @param {string} sessionId - Discussion session ID
   */
  requestConsensus(sessionId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('request_consensus', { sessionId });
  }

  /**
   * Request discussion summary
   * @param {string} sessionId - Discussion session ID
   */
  requestSummary(sessionId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('request_summary', { sessionId });
  }

  /**
   * End the discussion
   * @param {string} sessionId - Discussion session ID
   */
  endDiscussion(sessionId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('end_discussion', { sessionId });
  }

  /**
   * Request list of available agents
   */
  requestAgentList() {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('request_agent_list', {});
  }

  /**
   * Emit typing indicator
   * @param {string} sessionId - Discussion session ID
   * @param {string} userId - User ID
   */
  sendTypingIndicator(sessionId, userId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('typing', { sessionId, userId });
  }

  /**
   * Send stop typing indicator
   * @param {string} sessionId - Discussion session ID
   * @param {string} userId - User ID
   */
  sendStopTypingIndicator(sessionId, userId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.socket.emit('stop_typing', { sessionId, userId });
  }

  /**
   * Register event listener
   * @param {string} eventName - Event name
   * @param {function} callback - Callback function
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * Unregister event listener
   * @param {string} eventName - Event name
   * @param {function} callback - Callback function
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners
   */
  clearListeners() {
    this.listeners.clear();
  }
}

// Create singleton instance
export const discussionSocket = new DiscussionWebSocketService();

export default discussionSocket;
