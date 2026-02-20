/**
 * Script to initialize default email templates (English Version)
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
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Account Deleted</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>{{firstName}}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We confirm that your account on <strong>{{siteName}}</strong> has been successfully deleted.
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                All your personal data has been erased from our systems, in accordance with our privacy policy.
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
                <p style="margin: 0; color: #666666; font-size: 14px; font-style: italic;">
                  We are sad to see you go. If you change your mind, you are always welcome to create a new account.
                </p>
              </div>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you did not request this deletion, please contact us immediately.
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
Account Deleted

Hello {{firstName}},

We confirm that your account on {{siteName}} has been successfully deleted.

All your personal data has been erased from our systems.

We are sad to see you go. If you change your mind, you are always welcome back.

© 2025 {{siteName}}. All rights reserved.
    `,
  },
  // 8. Order Confirmation — Physical Product
  {
    type: 'order_confirmation_physical',
    name: 'Order Confirmation — Physical Product',
    description: 'Sent after purchase of a physical product requiring shipping',
    subject: 'Order Confirmed #{{orderNumber}} — {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — Physical Product</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
        <tr>
          <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:8px 8px 0 0;">
            <div style="font-size:48px;margin-bottom:16px;">📦</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Order Confirmed!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.6;">
              Your order <strong>#{{orderNumber}}</strong> has been confirmed. We are preparing your package and will notify you as soon as it ships.
            </p>
            <div style="margin:24px 0;padding:20px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Order Number:</strong> {{orderNumber}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Date:</strong> {{orderDate}}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Total:</strong> {{total}} {{currency}}</p>
            </div>
            <div style="margin:24px 0;padding:16px;background:#f3f4f6;border-radius:6px;">
              <p style="margin:0 0 8px;color:#555;font-size:14px;"><strong>Items ordered:</strong></p>
              {{#each items}}<p style="margin:0 0 4px;color:#333;font-size:14px;">• {{name}} × {{quantity}} — {{price}} {{../currency}}</p>{{/each}}
            </div>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              📬 A tracking email will be sent as soon as your package is on its way.
            </p>
            <table role="presentation" style="margin:24px 0;">
              <tr>
                <td>
                  <a href="{{actionUrl}}" style="display:inline-block;padding:14px 32px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                    Track My Order
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2025 {{siteName}}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Order Confirmed — Physical Product

Hello {{firstName}},

Your order #{{orderNumber}} has been confirmed. We are preparing your package.

Order Number: {{orderNumber}}
Date: {{orderDate}}
Total: {{total}} {{currency}}

Track your order: {{actionUrl}}

A tracking email will be sent as soon as your package ships.

© 2025 {{siteName}}. All rights reserved.`,
  },

  // 9. Order Confirmation — Digital Product
  {
    type: 'order_confirmation_digital',
    name: 'Order Confirmation — Digital Product',
    description: 'Sent after purchase of a digital product with license key or download URL',
    subject: 'Your purchase is ready — #{{orderNumber}} — {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Purchase Ready</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
        <tr>
          <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);border-radius:8px 8px 0 0;">
            <div style="font-size:48px;margin-bottom:16px;">⚡</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Your purchase is ready!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.6;">
              Your digital purchase <strong>#{{orderNumber}}</strong> is confirmed and immediately available.
            </p>
            <div style="margin:24px 0;padding:20px;background:#ede9fe;border-left:4px solid #6366f1;border-radius:4px;">
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Order Number:</strong> {{orderNumber}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Date:</strong> {{orderDate}}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Total:</strong> {{total}} {{currency}}</p>
            </div>
            {{#if licenseKey}}
            <div style="margin:24px 0;padding:20px;background:#f3f4f6;border-radius:6px;">
              <p style="margin:0 0 8px;color:#555;font-size:14px;"><strong>🔑 Your License Key:</strong></p>
              <p style="margin:0;color:#1a1a1a;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">{{licenseKey}}</p>
              {{#if licenseInstructions}}<p style="margin:12px 0 0;color:#555;font-size:13px;">{{licenseInstructions}}</p>{{/if}}
            </div>
            {{/if}}
            {{#if downloadUrl}}
            <table role="presentation" style="margin:24px 0;">
              <tr>
                <td>
                  <a href="{{downloadUrl}}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                    Download Now
                  </a>
                </td>
              </tr>
            </table>
            {{/if}}
            <table role="presentation" style="margin:16px 0;">
              <tr>
                <td>
                  <a href="{{actionUrl}}" style="display:inline-block;padding:12px 24px;background:#f3f4f6;color:#333;text-decoration:none;border-radius:6px;font-size:14px;">
                    View Order Details
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2025 {{siteName}}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Your Digital Purchase is Ready — #{{orderNumber}}

Hello {{firstName}},

Your digital purchase #{{orderNumber}} is confirmed and immediately available.

Order Number: {{orderNumber}}
Date: {{orderDate}}
Total: {{total}} {{currency}}

{{#if licenseKey}}
License Key: {{licenseKey}}
{{#if licenseInstructions}}Instructions: {{licenseInstructions}}{{/if}}
{{/if}}
{{#if downloadUrl}}Download: {{downloadUrl}}{{/if}}

View order details: {{actionUrl}}

© 2025 {{siteName}}. All rights reserved.`,
  },

  // 10. Order Confirmation — Subscription
  {
    type: 'order_confirmation_subscription',
    name: 'Order Confirmation — Subscription',
    description: 'Sent after purchase of a recurring subscription plan',
    subject: 'Welcome to your subscription — {{planName}} — {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
        <tr>
          <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px 8px 0 0;">
            <div style="font-size:48px;margin-bottom:16px;">🔄</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Subscription Activated!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.6;">
              Your subscription to <strong>{{planName}}</strong> is now active. Thank you!
            </p>
            <div style="margin:24px 0;padding:20px;background:#d1fae5;border-left:4px solid #10b981;border-radius:4px;">
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Plan:</strong> {{planName}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Billing Cycle:</strong> {{billingInterval}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Amount:</strong> {{total}} {{currency}} / {{billingInterval}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Next Renewal:</strong> {{nextRenewalDate}}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Started:</strong> {{orderDate}}</p>
            </div>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              You can manage or cancel your subscription at any time from your account settings.
            </p>
            <table role="presentation" style="margin:24px 0;">
              <tr>
                <td>
                  <a href="{{actionUrl}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                    Manage Subscription
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2025 {{siteName}}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Subscription Activated — {{planName}}

Hello {{firstName}},

Your subscription to {{planName}} is now active.

Plan: {{planName}}
Billing Cycle: {{billingInterval}}
Amount: {{total}} {{currency}} / {{billingInterval}}
Next Renewal: {{nextRenewalDate}}
Started: {{orderDate}}

Manage your subscription: {{actionUrl}}

© 2025 {{siteName}}. All rights reserved.`,
  },

  // 11. Payment Confirmation (receipt)
  {
    type: 'payment_confirmation',
    name: 'Payment Confirmation',
    description: 'Payment receipt sent after any successful payment',
    subject: 'Payment Received #{{orderNumber}} — {{siteName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
        <tr>
          <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);border-radius:8px 8px 0 0;">
            <div style="font-size:48px;margin-bottom:16px;">💳</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Payment Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.6;">
              We have received your payment. Here is your receipt.
            </p>
            <div style="margin:24px 0;padding:20px;background:#dbeafe;border-left:4px solid #1d4ed8;border-radius:4px;">
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Reference:</strong> {{orderNumber}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Date:</strong> {{orderDate}}</p>
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Amount Paid:</strong> <span style="font-size:18px;font-weight:700;color:#1d4ed8;">{{total}} {{currency}}</span></p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
            </div>
            <div style="margin:24px 0;padding:16px;background:#f3f4f6;border-radius:6px;">
              <p style="margin:0 0 8px;color:#555;font-size:14px;"><strong>Items:</strong></p>
              {{#each items}}<p style="margin:0 0 4px;color:#333;font-size:14px;">• {{name}} × {{quantity}} — {{price}} {{../currency}}</p>{{/each}}
            </div>
            <table role="presentation" style="margin:24px 0;">
              <tr>
                <td>
                  <a href="{{actionUrl}}" style="display:inline-block;padding:14px 32px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                    View Receipt
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#999;font-size:13px;line-height:1.5;">
              Keep this email as proof of payment. If you have any questions, contact our support team.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2025 {{siteName}}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Payment Confirmed — #{{orderNumber}}

Hello {{firstName}},

We have received your payment. Here is your receipt.

Reference: {{orderNumber}}
Date: {{orderDate}}
Amount Paid: {{total}} {{currency}}
Payment Method: {{paymentMethod}}

Items:
{{#each items}}• {{name}} × {{quantity}} — {{price}} {{currency}}
{{/each}}

View your receipt: {{actionUrl}}

© 2025 {{siteName}}. All rights reserved.`,
  },

  // 12. Email Update Notification
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
      // Check if template already exists
      const existing = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.type, template.type))
        .limit(1);

      if (existing.length > 0) {
        // Update existing template
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
  console.log('\n💡 Variables available in templates:');
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
