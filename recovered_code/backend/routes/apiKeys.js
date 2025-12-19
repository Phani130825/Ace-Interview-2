import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/api-keys/:service
 * @desc    Store an encrypted API key for a service
 * @access  Private
 */
router.post('/:service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params;
    const { apiKey } = req.body;
    const userId = req.user._id;

    // Validate service
    const validServices = ['gemini', 'openai', 'judge0'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service. Must be one of: ${validServices.join(', ')}`
      });
    }

    // Validate API key
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'API key is required and must be a non-empty string'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Set the encrypted API key
    user.setApiKey(service, apiKey.trim());
    await user.save();

    res.json({
      success: true,
      message: `${service.charAt(0).toUpperCase() + service.slice(1)} API key stored successfully`,
      data: {
        service,
        metadata: user.getApiKeyMetadata(service)
      }
    });
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store API key',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/api-keys/:service/status
 * @desc    Check if user has an API key for a service (doesn't expose the key)
 * @access  Private
 */
router.get('/:service/status', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user._id;

    // Validate service
    const validServices = ['gemini', 'openai', 'judge0'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service. Must be one of: ${validServices.join(', ')}`
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get metadata (doesn't expose the actual key)
    const metadata = user.getApiKeyMetadata(service);

    res.json({
      success: true,
      data: {
        service,
        ...metadata
      }
    });
  } catch (error) {
    console.error('Error checking API key status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check API key status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/api-keys/all/status
 * @desc    Get status of all API keys for the user
 * @access  Private
 */
router.get('/all/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const services = ['gemini', 'openai', 'judge0'];
    const apiKeysStatus = {};

    services.forEach(service => {
      apiKeysStatus[service] = user.getApiKeyMetadata(service);
    });

    res.json({
      success: true,
      data: apiKeysStatus
    });
  } catch (error) {
    console.error('Error getting API keys status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API keys status',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/api-keys/:service
 * @desc    Remove an API key for a service
 * @access  Private
 */
router.delete('/:service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user._id;

    // Validate service
    const validServices = ['gemini', 'openai', 'judge0'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service. Must be one of: ${validServices.join(', ')}`
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if key exists
    if (!user.hasApiKey(service)) {
      return res.status(404).json({
        success: false,
        message: `No API key found for ${service}`
      });
    }

    // Remove the API key
    await user.removeApiKey(service);
    await user.save();

    res.json({
      success: true,
      message: `${service.charAt(0).toUpperCase() + service.slice(1)} API key removed successfully`
    });
  } catch (error) {
    console.error('Error removing API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove API key',
      error: error.message
    });
  }
});

export default router;
