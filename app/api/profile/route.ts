import { NextRequest, NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, ne, or } from 'drizzle-orm';
import { emailRouter, emailTemplateRepository } from '@/lib/email';
import { notifyAdminClientAction } from '@/lib/notifications/admin-notifications';

/**
 * POST /api/profile
 * Update current user's profile information
 */
export async function POST(request: NextRequest) {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone, address, city, postalCode, country, position, email, username } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name and email are required' },
        { status: 400 }
      );
    }

    // Get current user data to check for email change
    const currentUserData = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId)
    });

    if (!currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const emailChanged = currentUserData.email !== email;

    // Check if email or username is already taken by another user
    if (email || username) {
      const conditions = [];
      if (email) conditions.push(eq(users.email, email));
      if (username) conditions.push(eq(users.username, username));

      if (conditions.length > 0) {
        const existingUser = await db.query.users.findFirst({
          where: and(
            conditions.length > 1 ? or(...conditions) : conditions[0],
            ne(users.id, currentUser.userId)
          )
        });

        if (existingUser) {
          if (existingUser.email === email) {
             return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
          }
          if (existingUser.username === username) {
             return NextResponse.json({ error: 'Username already in use' }, { status: 400 });
          }
        }
      }
    }

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName,
        lastName,
        email,
        username: username || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null,
        position: position || null,
        emailVerified: emailChanged ? null : currentUserData.emailVerified, // Reset verification if email changed
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.userId))
      .returning();

    // Send notification email if email changed
    if (emailChanged) {
      try {
        const template = await emailTemplateRepository.getTemplate('email_update_notification');
        if (template && template.isActive) {
          let htmlContent = template.htmlContent || '';
          let textContent = template.textContent || '';
          const subject = template.subject.replace('{{siteName}}', 'NeoSaaS');

          const variables = {
            firstName: firstName,
            siteName: 'NeoSaaS',
            newEmail: email,
            companyName: 'NeoSaaS Inc.'
          };

          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlContent = htmlContent.replace(regex, value);
            textContent = textContent.replace(regex, value);
          });

          await emailRouter.sendEmail({
            to: [email], // Send to new email
            from: { name: template.fromName, email: template.fromEmail },
            subject: subject,
            html: htmlContent,
            text: textContent,
            templateId: template.type,
          });
          
          // Optionally send to old email as well for security
          await emailRouter.sendEmail({
            to: [currentUserData.email], // Send to old email
            from: { name: template.fromName, email: template.fromEmail },
            subject: subject,
            html: htmlContent,
            text: textContent,
            templateId: template.type,
          });
        }
      } catch (emailError) {
        console.error('Failed to send email update notification:', emailError);
        // Don't fail the request
      }
    }

    // Track profile update action for admin
    const changedFields: string[] = [];
    if (currentUserData.firstName !== firstName) changedFields.push('first name');
    if (currentUserData.lastName !== lastName) changedFields.push('last name');
    if (emailChanged) changedFields.push('email');
    if (currentUserData.phone !== phone) changedFields.push('phone');
    if (currentUserData.address !== address) changedFields.push('address');

    if (changedFields.length > 0) {
      try {
        await notifyAdminClientAction({
          userId: currentUser.userId,
          userEmail: updatedUser.email,
          userName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          actionType: 'profile_update',
          actionTitle: 'Profile Updated',
          actionDescription: `Updated: ${changedFields.join(', ')}${emailChanged ? ` (email changed from ${currentUserData.email} to ${email})` : ''}`,
          priority: emailChanged ? 'normal' : 'low',
        });
      } catch (notifyError) {
        console.error('[Profile] Failed to send admin notification:', notifyError);
        // Don't fail the request
      }
    }

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
