import { Router } from 'express';
import { supportService } from '../services/support-service';
import { verifySupabaseAuth } from '../routes';

const router = Router();

router.post('/api/support/tickets', verifySupabaseAuth, async (req, res) => {
  try {
    const { subject, description, priority } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description required' });
    }

    const ticket = await supportService.createTicket(
      parseInt(userId),
      subject,
      description,
      priority || 'normal'
    );

    res.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/support/tickets', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tickets = await supportService.listTickets(parseInt(userId));

    res.json({
      success: true,
      tickets,
    });
  } catch (error: any) {
    console.error('List tickets error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/support/tickets/:id', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket = await supportService.getTicket(ticketId, parseInt(userId));

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/support/tickets/:id/messages', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const newMessage = await supportService.addMessage(
      ticketId,
      parseInt(userId),
      message,
      false
    );

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
