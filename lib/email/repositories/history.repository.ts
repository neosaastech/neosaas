/**
 * Repository pour gérer l'historique des emails avec Drizzle
 */

import { eq, and, gte, lte, lt, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { emailHistory, emailEvents } from '@/db/schema';
import type { EmailMessage, EmailProvider, EmailDeliveryStatus } from '../types';

export interface EmailHistoryQuery {
  provider?: EmailProvider;
  status?: EmailDeliveryStatus;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export class EmailHistoryRepository {
  /**
   * Créer un nouvel enregistrement d'historique
   */
  async create(
    message: EmailMessage,
    provider: EmailProvider,
    templateType?: string,
    messageId?: string
  ) {
    try {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];

      const result = await db
        .insert(emailHistory)
        .values({
          to: recipients as any,
          cc: (message.cc || []) as any,
          bcc: (message.bcc || []) as any,
          from: message.from,
          subject: message.subject,
          htmlContent: message.htmlContent,
          textContent: message.textContent,
          provider: provider as string,
          templateType,
          messageId,
          status: 'pending',
          tags: (message.tags || []) as any,
          metadata: (message.customHeaders || {}) as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Failed to create email history:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un email
   */
  async updateStatus(
    id: string,
    status: EmailDeliveryStatus,
    errorMessage?: string,
    messageId?: string
  ) {
    try {
      const updateData: any = {
        status: status as string,
        updatedAt: new Date(),
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      if (messageId) {
        updateData.messageId = messageId;
      }

      if (status === 'sent') {
        updateData.sentAt = new Date();
      }

      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const result = await db
        .update(emailHistory)
        .set(updateData)
        .where(eq(emailHistory.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Failed to update email status:', error);
      throw error;
    }
  }

  /**
   * Récupérer un email par son ID
   */
  async getById(id: string) {
    try {
      const result = await db
        .select()
        .from(emailHistory)
        .where(eq(emailHistory.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      // Récupérer les événements associés
      const events = await db
        .select()
        .from(emailEvents)
        .where(eq(emailEvents.emailHistoryId, id))
        .orderBy(desc(emailEvents.createdAt));

      return {
        ...result[0],
        events,
      };
    } catch (error) {
      console.error('Failed to get email by ID:', error);
      return null;
    }
  }

  /**
   * Rechercher des emails avec filtres
   */
  async search(query: EmailHistoryQuery) {
    try {
      const conditions: any[] = [];

      if (query.provider) {
        conditions.push(eq(emailHistory.provider, query.provider as string));
      }

      if (query.status) {
        conditions.push(eq(emailHistory.status, query.status as string));
      }

      if (query.from) {
        conditions.push(gte(emailHistory.createdAt, query.from));
      }

      if (query.to) {
        conditions.push(lte(emailHistory.createdAt, query.to));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Compter le total
      const countResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(emailHistory)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      // Récupérer les items
      const items = await db
        .select()
        .from(emailHistory)
        .where(whereClause)
        .orderBy(desc(emailHistory.createdAt))
        .limit(query.limit || 50)
        .offset(query.offset || 0);

      return {
        total,
        items,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };
    } catch (error) {
      console.error('Failed to search email history:', error);
      return {
        total: 0,
        items: [],
        limit: query.limit || 50,
        offset: query.offset || 0,
      };
    }
  }

  /**
   * Ajouter un événement à un email
   */
  async addEvent(
    emailHistoryId: string,
    eventType: string,
    provider: EmailProvider,
    eventData?: any
  ) {
    try {
      const result = await db
        .insert(emailEvents)
        .values({
          emailHistoryId,
          eventType,
          provider: provider as string,
          eventData: eventData || null,
          createdAt: new Date(),
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Failed to add email event:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques globales
   */
  async getStatistics(provider?: EmailProvider, from?: Date, to?: Date) {
    try {
      const conditions: any[] = [];

      if (provider) {
        conditions.push(eq(emailHistory.provider, provider as string));
      }

      if (from) {
        conditions.push(gte(emailHistory.createdAt, from));
      }

      if (to) {
        conditions.push(lte(emailHistory.createdAt, to));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, sentResult, failedResult, pendingResult] = await Promise.all([
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(emailHistory)
          .where(whereClause),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(emailHistory)
          .where(
            whereClause
              ? and(whereClause, eq(emailHistory.status, 'sent'))
              : eq(emailHistory.status, 'sent')
          ),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(emailHistory)
          .where(
            whereClause
              ? and(whereClause, eq(emailHistory.status, 'failed'))
              : eq(emailHistory.status, 'failed')
          ),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(emailHistory)
          .where(
            whereClause
              ? and(whereClause, eq(emailHistory.status, 'pending'))
              : eq(emailHistory.status, 'pending')
          ),
      ]);

      const total = totalResult[0]?.count || 0;
      const sent = sentResult[0]?.count || 0;
      const failed = failedResult[0]?.count || 0;
      const pending = pendingResult[0]?.count || 0;

      return {
        total,
        sent,
        failed,
        pending,
        delivered: sent,
        successRate: total > 0 ? (sent / total) * 100 : 0,
        failureRate: total > 0 ? (failed / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        delivered: 0,
        successRate: 0,
        failureRate: 0,
      };
    }
  }
}

// Export singleton
export const emailHistoryRepository = new EmailHistoryRepository();
