
import { db } from '../db';
import { emailTemplates } from '../db/schema';
import { emailTemplateRepository } from '../lib/email/repositories/template.repository';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Testing email template persistence...');

  const testType = 'test-persistence';
  const testEmail = 'test@example.com';

  // Clean up
  await db.delete(emailTemplates).where(eq(emailTemplates.type, testType));

  // Save
  console.log('Saving template...');
  await emailTemplateRepository.saveTemplate({
    type: testType,
    name: 'Test Template',
    fromName: 'Test Sender',
    fromEmail: testEmail,
    subject: 'Test Subject',
    isActive: true,
  });

  // Retrieve
  console.log('Retrieving template...');
  const retrieved = await emailTemplateRepository.getTemplate(testType);

  if (retrieved) {
    console.log('Retrieved template:', retrieved);
    if (retrieved.fromEmail === testEmail) {
      console.log('SUCCESS: fromEmail persisted correctly.');
    } else {
      console.error(`FAILURE: fromEmail mismatch. Expected ${testEmail}, got ${retrieved.fromEmail}`);
    }
  } else {
    console.error('FAILURE: Template not found after save.');
  }

  // Clean up
  await db.delete(emailTemplates).where(eq(emailTemplates.type, testType));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
