import express from 'express';
import Schedule from '../models/Schedule.js';
import { sendScheduleEmail, sendReminderEmail } from '../services/emailService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new schedule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { practiceType, scheduledDate, duration, notes } = req.body;
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userName = req.user.firstName || 'User';

    // Validate input
    if (!practiceType || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Practice type and scheduled date are required'
      });
    }

    // Check if scheduled date is in the future
    const schedDate = new Date(scheduledDate);
    if (schedDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    // Create schedule
    const schedule = new Schedule({
      userId,
      email: userEmail,
      practiceType,
      scheduledDate: schedDate,
      duration: duration || 30,
      notes: notes || ''
    });

    await schedule.save();

    // Send confirmation email
    try {
      await sendScheduleEmail(userEmail, userName, practiceType, schedDate, duration || 30);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    // Schedule reminder email (30 minutes before)
    const reminderTime = new Date(schedDate.getTime() - 30 * 60 * 1000);
    const timeUntilReminder = reminderTime.getTime() - Date.now();
    
    if (timeUntilReminder > 0 && timeUntilReminder < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
      setTimeout(async () => {
        try {
          const scheduleDoc = await Schedule.findById(schedule._id);
          if (scheduleDoc && scheduleDoc.status === 'scheduled' && !scheduleDoc.reminderSent) {
            await sendReminderEmail(userEmail, userName, practiceType, schedDate, duration || 30);
            scheduleDoc.reminderSent = true;
            await scheduleDoc.save();
          }
        } catch (error) {
          console.error('Error sending reminder:', error);
        }
      }, timeUntilReminder);
    }

    res.status(201).json({
      success: true,
      message: 'Practice session scheduled successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
});

// Get all schedules for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, fromDate, toDate } = req.query;

    let query = { userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) {
        query.scheduledDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.scheduledDate.$lte = new Date(toDate);
      }
    }

    const schedules = await Schedule.find(query)
      .sort({ scheduledDate: 1 })
      .lean();

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules',
      error: error.message
    });
  }
});

// Get upcoming schedules
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const schedules = await Schedule.find({
      userId,
      scheduledDate: { $gte: now },
      status: 'scheduled'
    })
      .sort({ scheduledDate: 1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching upcoming schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming schedules',
      error: error.message
    });
  }
});

// Get schedule by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId
    }).lean();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
});

// Update schedule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { practiceType, scheduledDate, duration, notes, status } = req.body;

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Update fields
    if (practiceType) schedule.practiceType = practiceType;
    if (scheduledDate) {
      const schedDate = new Date(scheduledDate);
      if (schedDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
      schedule.scheduledDate = schedDate;
      schedule.reminderSent = false; // Reset reminder flag
    }
    if (duration) schedule.duration = duration;
    if (notes !== undefined) schedule.notes = notes;
    if (status) schedule.status = status;

    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule',
      error: error.message
    });
  }
});

// Delete schedule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const schedule = await Schedule.findOneAndDelete({
      _id: req.params.id,
      userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message
    });
  }
});

// Mark schedule as completed
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.status = 'completed';
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule marked as completed',
      data: schedule
    });
  } catch (error) {
    console.error('Error completing schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete schedule',
      error: error.message
    });
  }
});

export default router;
