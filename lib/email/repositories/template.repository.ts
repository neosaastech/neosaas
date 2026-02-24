/**
 * Repository pour gérer les templates d'emails
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { emailTemplates } from '@/db/schema';
import type { EmailTemplate } from '../types';

export class EmailTemplateRepository {
  /**
   * Créer ou mettre à jour un template
   */
  async saveTemplate(template: Partial<EmailTemplate & { type: string }>) {
    try {
      const existing = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.type, template.type!))
        .limit(1);

      const templateData = {
        type: template.type!,
        name: template.name!,
        description: template.description,
        fromName: template.fromName!,
        fromEmail: template.fromEmail!,
        subject: template.subject!,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        isActive: template.isActive !== false,
        provider: template.provider as string | null,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        // Update
        await db
          .update(emailTemplates)
          .set(templateData)
          .where(eq(emailTemplates.type, template.type!));
      } else {
        // Insert
        await db.insert(emailTemplates).values({
          ...templateData,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Récupérer un template par son type
   */
  async getTemplate(type: string) {
    try {
      const result = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.type, type))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * Récupérer tous les templates
   */
  async getAllTemplates() {
    try {
      return await db.select().from(emailTemplates);
    } catch (error) {
      console.error('Failed to get all templates:', error);
      return [];
    }
  }

  /**
   * Supprimer un template
   */
  async deleteTemplate(type: string) {
    try {
      await db.delete(emailTemplates).where(eq(emailTemplates.type, type));
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }
}

// Export singleton
export const emailTemplateRepository = new EmailTemplateRepository();
