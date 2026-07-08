import { NextResponse } from "next/server"
import { db } from "@/db"
import { emailTemplates } from "@/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth/server"

const DEFAULT_FROM = {
  name: "NeoSaaS Platform",
  email: "no-reply@neosaas.tech",
}

const templates = [
  {
    type: "user_invitation",
    name: "Invitation utilisateur",
    description: "Email d'invitation à rejoindre une entreprise",
    subject: "Vous êtes invité(e) à rejoindre {{companyName}} sur {{siteName}}",
    htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #CD7F32 0%, #B86F28 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">✉️</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Vous êtes invité(e) !</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Bonjour,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">
            <strong>{{inviterName}}</strong> vous a invité(e) à rejoindre <strong>{{companyName}}</strong> sur {{siteName}}.
          </p>
          <p style="margin: 0 0 20px; color: #666666;">Votre rôle sera : <strong>{{roleName}}</strong></p>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #CD7F32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Accepter l'invitation
              </a>
            </td></tr>
          </table>
          <p style="margin: 30px 0 0; color: #999999; font-size: 14px;">
            Cette invitation expire dans 7 jours.
          </p>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Vous êtes invité(e) à rejoindre {{companyName}} sur {{siteName}}!\n\n{{inviterName}} vous a invité(e). Votre rôle sera : {{roleName}}\n\nAcceptez l'invitation : {{actionUrl}}\n\nCette invitation expire dans 7 jours.`,
  },
  {
    type: "email_verification",
    name: "Bienvenue - Inscription",
    description: "Email envoyé lors de l'inscription d'un nouvel utilisateur",
    subject: "Bienvenue sur {{siteName}} ! 🎉",
    htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #CD7F32 0%, #B86F28 100%); border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Bienvenue ! 🎉</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">
            Bonjour <strong>{{firstName}}</strong>,
          </p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">
            Nous sommes ravis de vous accueillir sur <strong>{{siteName}}</strong> !
          </p>
          <p style="margin: 0 0 30px; color: #666666; font-size: 16px;">
            Votre compte a été créé avec succès pour <strong>{{companyName}}</strong>.
          </p>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #CD7F32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Accéder à mon compte
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Bienvenue sur {{siteName}} !\n\nBonjour {{firstName}},\n\nVotre compte a été créé avec succès pour {{companyName}}.\n\nAccéder à mon compte : {{actionUrl}}`,
  },
  {
    type: "password_reset",
    name: "Réinitialisation de mot de passe",
    description: "Email envoyé lors d'une demande de réinitialisation de mot de passe",
    subject: "Réinitialisez votre mot de passe {{siteName}}",
    htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #CD7F32 0%, #B86F28 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Réinitialisation de mot de passe</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">
            Vous avez demandé la réinitialisation de votre mot de passe sur {{siteName}}.
          </p>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #CD7F32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Réinitialiser mon mot de passe
              </a>
            </td></tr>
          </table>
          <p style="margin: 30px 0 0; color: #999999; font-size: 14px;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
          </p>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Réinitialisation de mot de passe\n\nBonjour {{firstName}},\n\nVous avez demandé la réinitialisation de votre mot de passe sur {{siteName}}.\n\nRéinitialisez-le ici : {{actionUrl}}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
  },
  {
    type: "order_confirmation_physical",
    name: "Order — Physical Product",
    description: "Confirmation for physical product orders (shipping info)",
    subject: "Order Confirmed — #{{orderNumber}}",
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Order Confirmed!</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Thank you for your order! It's being prepared for shipping.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Order Number:</strong> {{orderNumber}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Date:</strong> {{orderDate}}</p>
            <p style="margin: 0; color: #666666; font-size: 14px;"><strong style="color: #333333;">Total:</strong> {{total}} {{currency}}</p>
          </div>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Order Confirmed!\n\nHello {{firstName}},\n\nThank you for your order! It's being prepared for shipping.\n\nOrder Number: {{orderNumber}}\nDate: {{orderDate}}\nTotal: {{total}} {{currency}}\n\nView your order: {{actionUrl}}`,
  },
  {
    type: "order_confirmation_digital",
    name: "Order — Digital Product",
    description: "Confirmation for digital product orders (license key, download)",
    subject: "Your Purchase is Ready — #{{orderNumber}}",
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">💾</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Your Purchase is Ready!</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Thank you for your purchase! Here's everything you need to get started.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Order Number:</strong> {{orderNumber}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Total:</strong> {{total}} {{currency}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">License Key:</strong> {{licenseKey}}</p>
            <p style="margin: 0; color: #666666; font-size: 14px;">{{licenseInstructions}}</p>
          </div>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{downloadUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Now</a>
            </td></tr>
          </table>
          <p style="margin: 0; color: #999999; font-size: 13px; text-align: center;">Or view your order: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Your Purchase is Ready!\n\nHello {{firstName}},\n\nOrder Number: {{orderNumber}}\nTotal: {{total}} {{currency}}\nLicense Key: {{licenseKey}}\n{{licenseInstructions}}\n\nDownload: {{downloadUrl}}\nView order: {{actionUrl}}`,
  },
  {
    type: "order_confirmation_subscription",
    name: "Order — Subscription",
    description: "Confirmation for subscription activation",
    subject: "Subscription Activated — #{{orderNumber}}",
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">⭐</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Subscription Activated!</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Your subscription is now active. Welcome aboard!</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Plan:</strong> {{planName}} ({{billingInterval}})</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Order Number:</strong> {{orderNumber}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Total:</strong> {{total}} {{currency}}</p>
            <p style="margin: 0; color: #666666; font-size: 14px;"><strong style="color: #333333;">Next renewal:</strong> {{nextRenewalDate}}</p>
          </div>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Manage Subscription</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Subscription Activated!\n\nHello {{firstName}},\n\nPlan: {{planName}} ({{billingInterval}})\nOrder Number: {{orderNumber}}\nTotal: {{total}} {{currency}}\nNext renewal: {{nextRenewalDate}}\n\nManage your subscription: {{actionUrl}}`,
  },
  {
    type: "payment_confirmation",
    name: "Payment Received",
    description: "Payment receipt sent for every successful payment",
    subject: "Payment Received — #{{orderNumber}}",
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">💳</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Payment Received</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">This confirms we've received your payment. Here's your receipt.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Order Number:</strong> {{orderNumber}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Date:</strong> {{orderDate}}</p>
            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;"><strong style="color: #333333;">Payment Method:</strong> {{paymentMethod}}</p>
            <p style="margin: 0; color: #666666; font-size: 14px;"><strong style="color: #333333;">Total Paid:</strong> {{total}} {{currency}}</p>
          </div>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{actionUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Receipt</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">© 2025 {{siteName}}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `Payment Received\n\nHello {{firstName}},\n\nOrder Number: {{orderNumber}}\nDate: {{orderDate}}\nPayment Method: {{paymentMethod}}\nTotal Paid: {{total}} {{currency}}\n\nView receipt: {{actionUrl}}`,
  },
]

export async function POST() {
  try {
    // Check if user is admin
    await requireAdmin()

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const template of templates) {
      try {
        const existing = await db.query.emailTemplates.findFirst({
          where: eq(emailTemplates.type, template.type),
        })

        if (existing) {
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
            .where(eq(emailTemplates.type, template.type))
          updated++
        } else {
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
          })
          created++
        }
      } catch (error: any) {
        errors.push(`${template.type}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: templates.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Email templates seed error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
