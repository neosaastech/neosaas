'use server'

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { emailTemplateRepository, emailRouter } from '@/lib/email';
import { createToken, verifyToken, hashPassword } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyAdminClientAction } from '@/lib/notifications/admin-notifications';

export async function recoverPassword(formData: FormData) {
  const email = formData.get('email') as string;
  
  if (!email) {
    return { error: 'Email is required' };
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Do not reveal if user exists
      return { success: true, message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    // Generate reset token
    // Using a custom payload for password reset
    const token = createToken({ 
      userId: user.id, 
      email: user.email, 
      // @ts-ignore - Adding custom property for reset flow
      purpose: 'password_reset' 
    });

    // Construct action URL
    let host = 'localhost:3000';
    try {
      const headersList = await headers();
      host = headersList.get('host') || 'localhost:3000';
    } catch (e) {
      console.error('Error getting headers:', e);
    }
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const actionUrl = `${protocol}://${host}/auth/reset-password?token=${token}`;

    // Get template
    const template = await emailTemplateRepository.getTemplate('password_reset');
    
    if (template) {
       let htmlContent = template.htmlContent || "";
       let textContent = template.textContent || "";
       
       const variables = {
          firstName: user.firstName || 'User',
          actionUrl: actionUrl,
          siteName: 'NeoSaaS',
       };

       Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, "g");
          htmlContent = htmlContent.replace(regex, value);
          textContent = textContent.replace(regex, value);
       });

       await emailRouter.sendEmail({
        to: user.email,
        from: template.fromEmail,
        fromName: template.fromName || undefined,
        subject: template.subject,
        htmlContent: htmlContent,
        textContent: textContent,
      });
    } else {
        console.warn('Password reset template not found');
    }

    return { success: true, message: 'If an account exists with this email, you will receive a password reset link.' };
  } catch (error) {
    console.error('Password recovery error:', error);
    return { error: 'An error occurred. Please try again.' };
  }
}

export async function resetPassword(token: string, password: string) {
  try {
    const payload = verifyToken(token);
    // @ts-ignore
    if (!payload || payload.purpose !== 'password_reset') {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Get user details for notification
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    const hashedPassword = await hashPassword(password);

    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, payload.userId));

    // Track password reset action for admin
    if (user) {
      try {
        await notifyAdminClientAction({
          userId: user.id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
          actionType: 'settings',
          actionTitle: 'Password Reset',
          actionDescription: 'User reset their password via email recovery link',
          priority: 'normal',
        });
      } catch (notifyError) {
        console.error('[Auth] Failed to send admin notification:', notifyError);
        // Don't fail the request
      }
    }

    return { success: true, message: 'Password reset successfully' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}
