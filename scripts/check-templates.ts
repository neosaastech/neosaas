
import { db } from '../db';
import { emailTemplates } from '../db/schema';

async function checkTemplates() {
  try {
    const templates = await db.select().from(emailTemplates);
    console.log('Templates found:', templates.length);
    templates.forEach(t => {
      console.log(`Type: ${t.type}, From: ${t.fromEmail}`);
    });
  } catch (error) {
    console.error('Error checking templates:', error);
  }
}

checkTemplates();
