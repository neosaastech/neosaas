/**
 * Script to initialize default email templates
 * Run with: npx tsx scripts/seed-email-templates.ts
 */

import { db } from '../db';
import { emailTemplates } from '../db/schema';
import { eq } from 'drizzle-orm';

// Default sender configuration
const DEFAULT_FROM = {
  name: 'NeoSaaS Platform',
  email: 'no-reply@neosaas.tech', // Verified domain
};

interface EmailTemplate {
  type: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

const templates: EmailTemplate[] = [
  // 1. Welcome / Registration
  {
    type: 'registration',
    name: 'Welcome - Registration',
    description: 'Email sent upon new user registration',
    subject: 'Welcome to {{siteName}}! 🎉',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Welcome! 🎉</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                We are thrilled to welcome you to <strong>{{siteName}}</strong>!
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your account has been successfully created. You can now log in and explore all our features.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Access My Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                Need help? Feel free to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Welcome to {{siteName}}!

Hello {{firstName}},

We are thrilled to welcome you to {{siteName}}!

Your account has been successfully created. You can now log in and explore all our features.

Access My Account: {{actionUrl}}

Need help? Feel free to contact us.

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 2. Email Verification
  {
    type: 'email_verification',
    name: 'Email Verification',
    description: 'Email to verify the email address',
    subject: 'Verify your email address - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 700;">Verify your email</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                To complete your registration on {{siteName}}, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                This link is valid for 24 hours.<br>
                If you did not create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Verify your email address

Hello {{firstName}},

To complete your registration on {{siteName}}, please verify your email address using the link below:

{{actionUrl}}

This link is valid for 24 hours.
If you did not create an account, you can safely ignore this email.

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 3. Password Reset
  {
    type: 'password_reset',
    name: 'Password Reset',
    description: 'Email to reset password',
    subject: 'Reset your password - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 700;">Password Reset</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You requested to reset your password on {{siteName}}. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⚠️ <strong>Important:</strong> This link expires in 1 hour.
                </p>
              </div>

              <p style="margin: 20px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you did not request this reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Password Reset

Hello {{firstName}},

You requested to reset your password on {{siteName}}. Use the link below to create a new password:

{{actionUrl}}

⚠️ IMPORTANT: This link expires in 1 hour.

If you did not request this reset, you can safely ignore this email.

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 4. User Invitation
  {
    type: 'user_invitation',
    name: 'User Invitation',
    description: 'Email invitation to join a company',
    subject: 'You are invited to join {{companyName}} on {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">✉️</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You are invited!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You have been invited to join <strong>{{companyName}}</strong> on {{siteName}}.
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and create your account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                This invitation expires in 7 days.<br>
                If you do not wish to join {{companyName}}, you can ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
You are invited!

Hello,

You have been invited to join {{companyName}} on {{siteName}}.

Click the link below to accept the invitation and create your account:

{{actionUrl}}

This invitation expires in 7 days.
If you do not wish to join {{companyName}}, you can ignore this email.

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 5. Order Confirmation
  {
    type: 'order_confirmation',
    name: 'Order Confirmation',
    description: 'Email for order confirmation',
    subject: 'Order Confirmation - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Order Confirmed!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for your order! We have received it and it is being processed.
              </p>

              <!-- Order Details Box -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong style="color: #333333;">Order Number:</strong> {{orderNumber}}
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px;">
                  <strong style="color: #333333;">Date:</strong> {{orderDate}}
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View My Order
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                You will receive a tracking email as soon as your order ships.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Order Confirmed!

Hello {{firstName}},

Thank you for your order! We have received it and it is being processed.

Order Number: {{orderNumber}}
Date: {{orderDate}}

View My Order: {{actionUrl}}

You will receive a tracking email as soon as your order ships.

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 6. General Notification
  {
    type: 'notification',
    name: 'General Notification',
    description: 'Template for general notifications',
    subject: 'Notification - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 700;">Notification</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                {{notificationMessage}}
              </p>

              <!-- CTA Button (if needed) -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Notification

Hello {{firstName}},

{{notificationMessage}}

View Details: {{actionUrl}}

© 2025 {{siteName}}. All rights reserved.
    `,
  },

  // 7. Account Deletion
  {
    type: 'account_deletion',
    name: 'Account Deletion',
    description: 'Email confirmation for account deletion',
    subject: 'Account Deletion Confirmation - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <div style="font-size: 28px; font-weight: bold; color: #CD7F32; letter-spacing: -0.5px;">NeoSaaS</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; padding: 12px; background-color: #fee2e2; border-radius: 50%; margin-bottom: 16px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </div>
                <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 700;">Account Deleted</h1>
              </div>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We are writing to confirm that your account on <strong>{{siteName}}</strong> has been successfully deleted.
              </p>
              
              <div style="background-color: #f3f4f6; border-left: 4px solid #CD7F32; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                  <strong>Confirmation:</strong> All your personal data and associated information have been permanently removed from our database in accordance with our data retention policy.
                </p>
              </div>

              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We're sorry to see you go. If you decide to return in the future, you will be more than welcome to create a new account.
              </p>

              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px;">
                If you did not request this deletion, please contact our support team immediately, although data recovery may not be possible.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Account Deleted - {{siteName}}

Hello {{firstName}},

We confirm that your account on {{siteName}} has been successfully deleted.

Confirmation: All your personal data and associated information have been permanently removed from our database.

We are sad to see you go. If you change your mind, you are always welcome back.

© 2025 {{siteName}}. All rights reserved.
    `,
  },
  // 8. Email Update Notification
  {
    type: 'email_update_notification',
    name: 'Email Update Notification',
    description: 'Email sent when email address is updated',
    subject: 'Security Alert: Email Address Updated - {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Updated</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Email Address Updated</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                 <!-- Logo Placeholder - Replace with actual logo URL if available -->
                 <div style="font-size: 24px; font-weight: bold; color: #333;">{{siteName}}</div>
              </div>

              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                This email is to confirm that the email address associated with your <strong>{{siteName}}</strong> account has been successfully updated.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #555; font-size: 14px;">
                  <strong>New Email Address:</strong> {{newEmail}}
                </p>
              </div>

              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                If you did not authorize this change, please contact our support team immediately to secure your account.
              </p>

              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

              <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">Legal Information</h3>
              <p style="margin: 0 0 10px; color: #666; font-size: 12px; line-height: 1.5;">
                This is an automated security notification. Please do not reply to this email.
              </p>
              <p style="margin: 0 0 10px; color: #666; font-size: 12px; line-height: 1.5;">
                <strong>{{companyName}}</strong><br>
                123 Tech Street, Innovation City<br>
                Privacy Policy | Terms of Service
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 {{siteName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    textContent: `
Email Address Updated - {{siteName}}

Hello {{firstName}},

This email is to confirm that the email address associated with your {{siteName}} account has been successfully updated.

New Email Address: {{newEmail}}

If you did not authorize this change, please contact our support team immediately.

Legal Information:
{{companyName}}
Privacy Policy | Terms of Service
    `
  }
];

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...\n');

  for (const template of templates) {
    try {
      // Vérifier si le template existe déjà
      const existing = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.type, template.type))
        .limit(1);

      if (existing.length > 0) {
        // Mettre à jour le template existant
        await db
          .update(emailTemplates)
          .set({
            name: template.name,
            description: template.description,
            fromName: DEFAULT_FROM.name,
            fromEmail: DEFAULT_FROM.email,
            subject: template.subject,
            htmlContent: template.htmlContent.trim(),
            textContent: template.textContent.trim(),
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.type, template.type));

        console.log(`✅ Updated: ${template.name} (${template.type})`);
      } else {
        // Create new template
        await db.insert(emailTemplates).values({
          type: template.type,
          name: template.name,
          description: template.description,
          fromName: DEFAULT_FROM.name,
          fromEmail: DEFAULT_FROM.email,
          subject: template.subject,
          htmlContent: template.htmlContent.trim(),
          textContent: template.textContent.trim(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created: ${template.name} (${template.type})`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${template.name}:`, error);
    }
  }

  console.log('\n🎉 Email templates seeded successfully!');
  console.log(`\n📝 Total templates: ${templates.length}`);
  console.log('\n💡 Available variables in templates:');
  console.log('   - {{firstName}}, {{lastName}}, {{email}}');
  console.log('   - {{companyName}}, {{siteName}}');
  console.log('   - {{actionUrl}}');
  console.log('   - {{orderNumber}}, {{orderDate}}');
  console.log('   - {{notificationMessage}}');
}

seedEmailTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding templates:', error);
    process.exit(1);
  });
