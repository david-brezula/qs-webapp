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

  // NOTE: the generic construction enquiry is mapped onto the legacy
  // (solar-era) ContactSubmission columns so no DB migration is needed and the
  // form keeps working. `projectType` holds the trade; `notes` holds the message
  // (+ phone). Cleaning up the model (add phone/serviceType/message columns,
  // drop the solar-only ones) is a documented follow-up.
  await prisma.contactSubmission.create({
    data: {
      company: company?.trim() || "—",
      name,
      email,
      projectType: serviceType,
      sizeMW: 0,
      country: "",
      startDate: "",
      scope: [],
      notes: [message, phone ? `Phone: ${phone}` : null]
        .filter(Boolean)
        .join("\n\n"),
    },
  });

  await sendContactNotification({ name, email, phone, company, serviceType, message }).catch(
    (err) => {
      console.error("Contact email notification failed:", err);
    },
  );

  return NextResponse.json({ ok: true });
}
