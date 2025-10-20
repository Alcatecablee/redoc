import { db } from '../db';
import { supportTickets, supportTicketMessages } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';

export class SupportService {
  private ensureDb() {
    if (!db) {
      throw new Error('Database not configured');
    }
    return db;
  }

  async createTicket(userId: number, subject: string, description: string, priority: string = 'normal') {
    const database = this.ensureDb();
    const slaHours: Record<string, number> = {
      low: 72,
      normal: 48,
      high: 24,
      urgent: 4,
    };

    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (slaHours[priority] || 48));

    const [ticket] = await database.insert(supportTickets).values({
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
    const database = this.ensureDb();
    return await database.query.supportTickets.findMany({
      where: eq(supportTickets.user_id, userId),
      orderBy: (tickets, { desc }) => [desc(tickets.created_at)],
    });
  }

  async getTicket(ticketId: number, userId: number) {
    const database = this.ensureDb();
    const ticket = await database.query.supportTickets.findFirst({
      where: and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.user_id, userId)
      ),
    });

    if (!ticket) {
      return null;
    }

    const messages = await database.query.supportTicketMessages.findMany({
      where: eq(supportTicketMessages.ticket_id, ticketId),
      orderBy: (msgs, { asc }) => [asc(msgs.created_at)],
    });

    return { ...ticket, messages };
  }

  async addMessage(ticketId: number, userId: number, message: string, isInternal: boolean = false) {
    const database = this.ensureDb();
    const [newMessage] = await database.insert(supportTicketMessages).values({
      ticket_id: ticketId,
      user_id: userId,
      message,
      is_internal: isInternal,
      created_at: new Date(),
    }).returning();

    await database.update(supportTickets)
      .set({ updated_at: new Date() })
      .where(eq(supportTickets.id, ticketId));

    return newMessage;
  }

  async updateTicketStatus(ticketId: number, status: string) {
    const database = this.ensureDb();
    const resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;

    await database.update(supportTickets)
      .set({ 
        status, 
        updated_at: new Date(),
        resolved_at: resolvedAt
      })
      .where(eq(supportTickets.id, ticketId));
  }

  async assignTicket(ticketId: number, assignedTo: number) {
    const database = this.ensureDb();
    await database.update(supportTickets)
      .set({ 
        assigned_to: assignedTo,
        status: 'in_progress',
        updated_at: new Date()
      })
      .where(eq(supportTickets.id, ticketId));
  }
}

export const supportService = new SupportService();
