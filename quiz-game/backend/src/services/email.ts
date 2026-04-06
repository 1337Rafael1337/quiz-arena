import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  if (!config.SMTP_HOST) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    } : undefined,
  })

  return transporter
}

export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<boolean> {
  const resetUrl = `${config.CLIENT_URL}/reset-password?token=${token}`

  const transport = getTransporter()

  if (!transport) {
    console.warn('⚠️  SMTP nicht konfiguriert - Reset-Link wird nur in der Konsole ausgegeben:')
    console.log(`🔑 Password reset link for ${email}: ${resetUrl}`)
    return false
  }

  try {
    await transport.sendMail({
      from: config.SMTP_FROM,
      sender: config.SMTP_FROM,
      envelope: {
        from: config.SMTP_FROM,
        to: email,
      },
      to: email,
      subject: 'Quiz Arena - Passwort zurücksetzen',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
          <div style="background: linear-gradient(135deg, #1e1b4b, #4c1d95); padding: 2rem; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 1.8rem;">Quiz Arena</h1>
          </div>
          <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Hallo ${username}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Button um ein neues Passwort zu vergeben:
            </p>
            <div style="text-align: center; margin: 2rem 0;">
              <a href="${resetUrl}"
                 style="background: #6366f1; color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.05rem; display: inline-block;">
                Passwort zurücksetzen
              </a>
            </div>
            <p style="color: #6b7280; font-size: 0.85rem; line-height: 1.5;">
              Dieser Link ist 1 Stunde gültig.<br>
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
              <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;">
            <p style="color: #9ca3af; font-size: 0.8rem; text-align: center;">
              Falls du kein neues Passwort angefordert hast, kannst du diese Email ignorieren.
            </p>
          </div>
        </div>
      `,
      text: `Hallo ${username}!\n\nDu hast eine Passwort-Zurücksetzung angefordert:\n${resetUrl}\n\nDieser Link ist 1 Stunde gültig.\n\nFalls du kein neues Passwort angefordert hast, kannst du diese Email ignorieren.`,
    })

    console.log(`🔑 Password reset email sent to ${email}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error)
    console.log(`🔑 Fallback - Password reset link for ${email}: ${resetUrl}`)
    return false
  }
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  const verifyUrl = `${config.CLIENT_URL}/verify-email?token=${token}`

  const transport = getTransporter()

  if (!transport) {
    console.warn('⚠️  SMTP nicht konfiguriert - Verification-Link wird nur in der Konsole ausgegeben:')
    console.log(`📧 Verification link for ${email}: ${verifyUrl}`)
    return false
  }

  try {
    await transport.sendMail({
      from: config.SMTP_FROM,
      sender: config.SMTP_FROM,
      envelope: {
        from: config.SMTP_FROM,
        to: email,
      },
      to: email,
      subject: 'Quiz Arena - Email bestätigen',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
          <div style="background: linear-gradient(135deg, #1e1b4b, #4c1d95); padding: 2rem; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 1.8rem;">Quiz Arena</h1>
          </div>
          <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Hallo ${username}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Vielen Dank für deine Registrierung als Spielleiter bei Quiz Arena.
              Bitte bestätige deine Email-Adresse, indem du auf den folgenden Button klickst:
            </p>
            <div style="text-align: center; margin: 2rem 0;">
              <a href="${verifyUrl}"
                 style="background: #6366f1; color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.05rem; display: inline-block;">
                Email bestätigen
              </a>
            </div>
            <p style="color: #6b7280; font-size: 0.85rem; line-height: 1.5;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;">
            <p style="color: #9ca3af; font-size: 0.8rem; text-align: center;">
              Falls du diese Email nicht angefordert hast, kannst du sie ignorieren.
            </p>
          </div>
        </div>
      `,
      text: `Hallo ${username}!\n\nBitte bestätige deine Email-Adresse für Quiz Arena:\n${verifyUrl}\n\nFalls du diese Email nicht angefordert hast, kannst du sie ignorieren.`,
    })

    console.log(`📧 Verification email sent to ${email}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send verification email:', error)
    console.log(`📧 Fallback - Verification link for ${email}: ${verifyUrl}`)
    return false
  }
}
