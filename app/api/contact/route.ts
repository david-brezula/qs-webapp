import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact-schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  console.log("[contact] new RFP submission", {
    company: parsed.data.company,
    email: parsed.data.email,
    projectType: parsed.data.projectType,
    sizeMW: parsed.data.sizeMW,
    state: parsed.data.state,
    startDate: parsed.data.startDate,
    scope: parsed.data.scope,
  });

  return NextResponse.json({ ok: true });
}
