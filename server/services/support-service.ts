import { db } from '../db';
import { supportTickets, supportTicketMessages } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';

export class SupportService {
  async createTicket(userId: number, subject: string, description: string, priority: string = 'normal') {
    const slaHours: Record<string, number> = {
      low: 72,
      normal: 48,
      high: 24,
      urgent: 4,
    };

    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (slaHours[priority] || 48));

    const [ticket] = await db.insert(supportTickets).values({
      user_id: userId,
      subject,
      description,
      priority,
      status: 'open',
      sla_deadline: slaDeadline,
      created_at: new Date(),
      updated_at: new Date(),
      assigned_to: null,
      resolved_at: null,
    }).returning();

    return ticket;
  }

  async listTickets(userId: number) {
    return await db.query.supportTickets.findMany({
      where: eq(supportTickets.user_id, userId),
      orderBy: (tickets, { desc }) => [desc(tickets.created_at)],
    });
  }

  async getTicket(ticketId: number, userId: number) {
    const ticket = await db.query.supportTickets.findFirst({
      where: and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.user_id, userId)
      ),
    });

    if (!ticket) {
      return null;
    }

    const messages = await db.query.supportTicketMessages.findMany({
      where: eq(supportTicketMessages.ticket_id, ticketId),
      orderBy: (msgs, { asc }) => [asc(msgs.created_at)],
    });

    return { ...ticket, messages };
  }

  async addMessage(ticketId: number, userId: number, message: string, isInternal: boolean = false) {
    const [newMessage] = await db.insert(supportTicketMessages).values({
      ticket_id: ticketId,
      user_id: userId,
      message,
      is_internal: isInternal,
      created_at: new Date(),
    }).returning();

    await db.update(supportTickets)
      .set({ updated_at: new Date() })
      .where(eq(supportTickets.id, ticketId));

    return newMessage;
  }

  async updateTicketStatus(ticketId: number, status: string) {
    const resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;

    await db.update(supportTickets)
      .set({ 
        status, 
        updated_at: new Date(),
        resolved_at: resolvedAt
      })
      .where(eq(supportTickets.id, ticketId));
  }

  async assignTicket(ticketId: number, assignedTo: number) {
    await db.update(supportTickets)
      .set({ 
        assigned_to: assignedTo,
        status: 'in_progress',
        updated_at: new Date()
      })
      .where(eq(supportTickets.id, ticketId));
  }
}

export const supportService = new SupportService();
