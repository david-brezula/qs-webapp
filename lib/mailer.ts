import nodemailer from "nodemailer";

export async function sendContactNotification(data: {
  company: string;
  name: string;
  email: string;
  projectType: string;
  sizeMW?: number | null;
  country: string;
  startDate?: string | null;
  scope: string | string[];
  notes?: string | null;
}) {
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!to || !process.env.SMTP_HOST) return; // skip if not configured

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const scopeText = Array.isArray(data.scope) ? data.scope.join(", ") : data.scope;

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `New contact enquiry — ${data.company}`,
    text: [
      `Company: ${data.company}`,
      `Contact: ${data.name} <${data.email}>`,
      `Project type: ${data.projectType}`,
      data.sizeMW != null ? `Size: ${data.sizeMW} MW` : null,
      `Country: ${data.country}`,
      data.startDate ? `Start: ${data.startDate}` : null,
      `Scope: ${scopeText}`,
      data.notes ? `Notes: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
