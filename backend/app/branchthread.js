const express = require('express');
const router = express.Router();
const Thread = require('../models/Thread'); // Adjust the path as necessary

router.post('/api/branch-thread', async (req, res) => {
  const { currentThreadId, promptId } = req.body;

  try {
    // Fetch the current thread
    const currentThread = await Thread.findById(currentThreadId);
    if (!currentThread) {
      return res.status(404).json({ error: 'Current thread not found' });
    }

    // Identify messages up to the selected prompt
    const messagesUpToPrompt = currentThread.messages.filter(
      (message) => message.id <= promptId
    );

    // Create a new thread with the selected messages
    const newThread = new Thread({
      messages: messagesUpToPrompt,
      parentThreadId: currentThreadId,
    });

    await newThread.save();

    res.status(201).json({ newThreadId: newThread._id });
  } catch (error) {
    console.error('Error branching thread:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;