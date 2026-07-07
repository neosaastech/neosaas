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
              <a href="{{inviteUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #CD7F32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
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
    textContent: `Vous êtes invité(e) à rejoindre {{companyName}} sur {{siteName}}!\n\n{{inviterName}} vous a invité(e). Votre rôle sera : {{roleName}}\n\nAcceptez l'invitation : {{inviteUrl}}\n\nCette invitation expire dans 7 jours.`,
  },
  {
    type: "registration",
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
    type: "account_update",
    name: "Modification de compte",
    description: "Email envoyé lors de la modification des informations de compte",
    subject: "Votre compte {{siteName}} a été modifié",
    htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px;">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Modification de compte</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
          <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">
            Vos informations de compte ont été modifiées avec succès.
          </p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f3f4f6; border-left: 4px solid #CD7F32; border-radius: 4px;">
            <p style="margin: 0; color: #333; font-size: 14px;"><strong>Modifications effectuées :</strong></p>
            <p style="margin: 10px 0 0; color: #666; font-size: 14px;">{{updateDetails}}</p>
          </div>
          <p style="margin: 20px 0; color: #666;">
            <strong>Informations actuelles :</strong><br>
            Email : {{email}}<br>
            Nom : {{firstName}} {{lastName}}<br>
            Entreprise : {{companyName}}
          </p>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #CD7F32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Voir mon profil
              </a>
            </td></tr>
          </table>
          <p style="margin: 20px 0 0; color: #999; font-size: 13px;">
            Si vous n'êtes pas à l'origine de ces modifications, contactez-nous immédiatement.
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
    textContent: `Modification de compte\n\nBonjour {{firstName}},\n\nVos informations ont été modifiées:\n{{updateDetails}}\n\nInformations actuelles:\nEmail: {{email}}\nNom: {{firstName}} {{lastName}}\nEntreprise: {{companyName}}\n\nVoir mon profil: {{dashboardUrl}}`,
  },
  {
    type: "admin_notification",
    name: "Notification Admin",
    description: "Email envoyé aux super admins pour les changements importants",
    subject: "[Admin] {{notificationType}} - {{siteName}}",
    htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px;">
        <tr><td style="padding: 40px 40px 20px; text-align: center; background: #1a1a1a; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🔔 Notification Admin</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <h2 style="margin: 0 0 20px; color: #333; font-size: 20px;">{{notificationType}}</h2>
          <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Détails de l'événement:</strong></p>
            <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">{{eventDetails}}</p>
            <p style="margin: 10px 0 0; color: #92400e; font-size: 13px;"><strong>Date:</strong> {{timestamp}}</p>
          </div>
          <p style="margin: 20px 0; color: #666;">
            <strong>Informations utilisateur :</strong><br>
            {{userInfo}}
          </p>
          <table role="presentation" style="margin: 30px 0;">
            <tr><td style="text-align: center;">
              <a href="{{adminUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Voir dans l'admin
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #999999; font-size: 12px;">Notification automatique - {{siteName}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textContent: `[Admin] {{notificationType}}\n\nDétails: {{eventDetails}}\nDate: {{timestamp}}\n\nUtilisateur: {{userInfo}}\n\nVoir dans l'admin: {{adminUrl}}`,
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
