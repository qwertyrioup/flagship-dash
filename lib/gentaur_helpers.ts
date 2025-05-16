import nodemailer from 'nodemailer';
import { CLINT_NODEMAILER_PASS, CLINT_NODEMAILER_USER } from './consts';

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export function getBulkProductLinkMailOptionsGenerator(
  user: { email: string; name: string },
  downloadUrl: string
): MailOptions {
  return {
    from: process.env.EMAIL_FROM || 'noreply@gentaur.com',
    to: user.email,
    subject: 'Your Bulk Product Data is Ready',
    html: `
      <h1>Hello ${user.name},</h1>
      <p>Your bulk product data has been processed and is ready for download.</p>
      <p>You can download the file using the following link:</p>
      <p><a href="${downloadUrl}">Download File</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>Gentaur Team</p>
    `
  };
}

export async function getTransporter(): Promise<nodemailer.Transporter> {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: CLINT_NODEMAILER_USER,
      pass: CLINT_NODEMAILER_PASS
    }
  });
} 