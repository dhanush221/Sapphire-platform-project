import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'dhanushreddy2204@gmail.com';
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const from = process.env.EMAIL_FROM || user;

export function getMailer() {
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export async function sendMail(options) {
  const transporter = getMailer();
  if (!transporter) {
    throw new Error('Email transport is not configured (set SMTP_USER/SMTP_PASS).');
  }
  return transporter.sendMail({ from, ...options });
}
