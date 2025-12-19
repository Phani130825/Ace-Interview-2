import express from 'express';
import PlacementSimulation from '../models/PlacementSimulation.js';

const router = express.Router();

// Get or create active placement simulation
router.get('/active', async (req, res) => {
  try {
    const userId = req.user._id;

    // Find active simulation
    let simulation = await PlacementSimulation.findOne({
      userId,
      status: 'in-progress'
    }).sort({ createdAt: -1 });

    // If no active simulation, create one
    if (!simulation) {
      simulation = new PlacementSimulation({
        userId,
        currentStep: 0,
        status: 'in-progress'
      });
      await simulation.save();
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error getting active simulation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active simulation',
      error: error.message
    });
  }
});

// Start new placement simulation
router.post('/start', async (req, res) => {
  try {
    const userId = req.user._id;

    // Mark any existing in-progress simulations as abandoned
    await PlacementSimulation.updateMany(
      { userId, status: 'in-progress' },
      { status: 'abandoned' }
    );

    // Create new simulation
    const simulation = new PlacementSimulation({
      userId,
      currentStep: 0,
      status: 'in-progress'
    });

    await simulation.save();

    res.status(201).json({
      success: true,
      message: 'New placement simulation started',
      data: simulation
    });
  } catch (error) {
    console.error('Error starting simulation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start simulation',
      error: error.message
    });
  }
});

// Update resume step
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { resumeText } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    // Update resume
    simulation.resume = {
      text: resumeText,
      completed: true,
      completedAt: new Date(),
      score: 100 // Full marks for submitting resume
    };
    simulation.currentStep = Math.max(simulation.currentStep, 1);

    await simulation.save();

    res.json({
      success: true,
      message: 'Resume submitted successfully',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resume',
      error: error.message
    });
  }
});

// Update aptitude test step
router.post('/:id/aptitude', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { questions, answers, score, correctAnswers, totalQuestions, timeTaken } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    if (!simulation.resume.completed) {
      return res.status(400).json({
        success: false,
        message: 'Resume step must be completed first'
      });
    }

    simulation.aptitude = {
      questions,
      answers,
      score,
      correctAnswers,
      totalQuestions,
      timeTaken,
      completed: true,
      completedAt: new Date()
    };
    simulation.currentStep = Math.max(simulation.currentStep, 2);

    await simulation.save();

    res.json({
      success: true,
      message: 'Aptitude test completed',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating aptitude test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update aptitude test',
      error: error.message
    });
  }
});

// Update coding round step
router.post('/:id/coding', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { questionTitle, code, language, testsPassed, totalTests, score, timeTaken } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    if (!simulation.aptitude.completed) {
      return res.status(400).json({
        success: false,
        message: 'Aptitude test must be completed first'
      });
    }

    simulation.coding = {
      questionTitle,
      code,
      language,
      testsPassed,
      totalTests,
      score,
      timeTaken,
      completed: true,
      completedAt: new Date()
    };
    simulation.currentStep = Math.max(simulation.currentStep, 3);

    await simulation.save();

    res.json({
      success: true,
      message: 'Coding round completed',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating coding round:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coding round',
      error: error.message
    });
  }
});

// Update technical interview step
router.post('/:id/technical-interview', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { questions, answers, responses, score, feedback, duration } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    if (!simulation.coding.completed) {
      return res.status(400).json({
        success: false,
        message: 'Coding round must be completed first'
      });
    }

    simulation.technicalInterview = {
      questions,
      answers: answers || responses, // Accept both field names
      score,
      feedback,
      duration,
      completed: true,
      completedAt: new Date()
    };
    simulation.currentStep = Math.max(simulation.currentStep, 4);

    await simulation.save();

    res.json({
      success: true,
      message: 'Technical interview completed',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating technical interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update technical interview',
      error: error.message
    });
  }
});

// Update managerial interview step
router.post('/:id/managerial-interview', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { questions, answers, responses, score, feedback, duration } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    if (!simulation.technicalInterview.completed) {
      return res.status(400).json({
        success: false,
        message: 'Technical interview must be completed first'
      });
    }

    simulation.managerialInterview = {
      questions,
      answers: answers || responses, // Accept both field names
      score,
      feedback,
      duration,
      completed: true,
      completedAt: new Date()
    };
    simulation.currentStep = Math.max(simulation.currentStep, 5);

    await simulation.save();

    res.json({
      success: true,
      message: 'Managerial interview completed',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating managerial interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update managerial interview',
      error: error.message
    });
  }
});

// Update HR interview step (final step)
router.post('/:id/hr-interview', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { questions, answers, responses, score, feedback, duration } = req.body;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    if (!simulation.managerialInterview.completed) {
      return res.status(400).json({
        success: false,
        message: 'Managerial interview must be completed first'
      });
    }

    simulation.hrInterview = {
      questions,
      answers: answers || responses, // Accept both field names
      score,
      feedback,
      duration,
      completed: true,
      completedAt: new Date()
    };
    simulation.currentStep = 6;
    simulation.status = 'completed';
    simulation.completedAt = new Date();

    // Calculate overall score
    simulation.calculateOverallScore();

    // Calculate total time
    const startTime = new Date(simulation.startedAt).getTime();
    const endTime = new Date(simulation.completedAt).getTime();
    simulation.totalTimeTaken = Math.floor((endTime - startTime) / 1000); // in seconds

    await simulation.save();

    res.json({
      success: true,
      message: 'HR interview completed - Placement simulation finished!',
      data: simulation
    });
  } catch (error) {
    console.error('Error updating HR interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update HR interview',
      error: error.message
    });
  }
});

// Get simulation history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const simulations = await PlacementSimulation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: simulations
    });
  } catch (error) {
    console.error('Error getting simulation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get simulation history',
      error: error.message
    });
  }
});

// Get simulation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const simulation = await PlacementSimulation.findOne({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error getting simulation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get simulation',
      error: error.message
    });
  }
});

// Delete simulation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const simulation = await PlacementSimulation.findOneAndDelete({ _id: id, userId });
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      message: 'Simulation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete simulation',
      error: error.message
    });
  }
});

export default router;
