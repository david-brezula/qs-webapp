import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact-schema";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendContactNotification } from "@/lib/mailer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, email, phone, company, serviceType, message } = parsed.data;

  await prisma.contactSubmission.create({
    data: {
      name,
      email,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      serviceType,
      message,
    },
  });

  await sendContactNotification({ name, email, phone, company, serviceType, message }).catch(
    (err) => {
      console.error("Contact email notification failed:", err);
    },
  );

  return NextResponse.json({ ok: true });
}
