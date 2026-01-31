/**
 * Rate Limiter Service
 * Manages API request queuing to prevent exceeding rate limits
 * Handles Gemini API calls with exponential backoff and request throttling
 */

export class RateLimiter {
  constructor(options = {}) {
    this.maxRequestsPerSecond = options.maxRequestsPerSecond || 10;
    this.maxConcurrentRequests = options.maxConcurrentRequests || 5;
    this.backoffMultiplier = options.backoffMultiplier || 1.5;
    this.maxRetries = options.maxRetries || 3;
    
    this.queue = [];
    this.processing = false;
    this.activeRequests = 0;
    this.lastRequestTime = 0;
    this.retryAttempts = new Map();
  }

  /**
   * Add a function to the queue for rate-limited execution
   * @param {Function} fn - Async function to execute
   * @param {string} requestId - Unique identifier for this request
   * @returns {Promise} - Result of the function execution
   */
  async add(fn, requestId = null) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        requestId: requestId || `req_${Date.now()}_${Math.random()}`,
        addedAt: Date.now()
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Process the queue with rate limiting
   */
  async process() {
    this.processing = true;

    while (this.queue.length > 0 || this.activeRequests > 0) {
      // If we have capacity, process next item from queue
      if (this.activeRequests < this.maxConcurrentRequests && this.queue.length > 0) {
        const nextItem = this.queue.shift();
        this.executeWithRateLimit(nextItem);
      } else {
        // Wait a bit before checking again
        await this.sleep(100);
      }
    }

    this.processing = false;
  }

  /**
   * Execute function with rate limiting and retry logic
   */
  async executeWithRateLimit(item) {
    const { fn, resolve, reject, requestId } = item;
    this.activeRequests++;

    try {
      // Ensure minimum time between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minTimeBetweenRequests = 1000 / this.maxRequestsPerSecond;

      if (timeSinceLastRequest < minTimeBetweenRequests) {
        await this.sleep(minTimeBetweenRequests - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();

      // Execute the function with retry logic
      const result = await this.executeWithRetry(fn, requestId);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  async executeWithRetry(fn, requestId) {
    let lastError;
    const retryCount = this.retryAttempts.get(requestId) || 0;

    if (retryCount >= this.maxRetries) {
      throw new Error(`Max retries (${this.maxRetries}) exceeded for request ${requestId}`);
    }

    try {
      const result = await fn();
      this.retryAttempts.delete(requestId);
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is rate limit related
      const isRateLimitError =
        error.message?.includes('429') ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('rate limit') ||
        error.status === 429;

      if (isRateLimitError && retryCount < this.maxRetries) {
        // Exponential backoff
        const backoffTime = Math.pow(this.backoffMultiplier, retryCount) * 1000;
        console.warn(
          `Rate limit hit for ${requestId}. Retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`
        );

        this.retryAttempts.set(requestId, retryCount + 1);
        await this.sleep(backoffTime);

        // Retry the function
        return this.executeWithRetry(fn, requestId);
      }

      throw lastError;
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      isProcessing: this.processing,
      lastRequestTime: this.lastRequestTime,
      retryAttempts: Array.from(this.retryAttempts.entries())
    };
  }

  /**
   * Clear all pending requests
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    return clearedCount;
  }
}

// Singleton instance for Gemini API
export const geminiRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 10,      // Conservative limit for free tier
  maxConcurrentRequests: 3,       // Only 3 concurrent Gemini requests
  backoffMultiplier: 2,           // Exponential backoff: 1s, 2s, 4s
  maxRetries: 3
});

export default RateLimiter;
