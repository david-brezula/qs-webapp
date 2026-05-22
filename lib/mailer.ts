import nodemailer from "nodemailer";

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  serviceType: string;
  message: string;
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

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    replyTo: data.email,
    subject: `New enquiry — ${data.serviceType}${data.company ? ` · ${data.company}` : ""}`,
    text: [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      data.phone ? `Phone: ${data.phone}` : null,
      data.company ? `Company: ${data.company}` : null,
      `Service: ${data.serviceType}`,
      "",
      data.message,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}
