import { NextResponse } from "next/server";
import { careersSchema } from "@/lib/careers-schema";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendWorkerApplicationNotification } from "@/lib/mailer";

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

  // Honeypot: quietly succeed without persisting.
  if (typeof body === "object" && body !== null && "_hp" in body) {
    const hp = (body as { _hp?: unknown })._hp;
    if (typeof hp === "string" && hp.length > 0) {
      return NextResponse.json({ ok: true });
    }
  }

  const parsed = careersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const d = parsed.data;
  await prisma.workerApplication.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone?.trim() || null,
      trades: d.trades,
      experienceYears: d.experienceYears ?? null,
      location: d.location?.trim() || null,
      willingToTravel: d.willingToTravel ?? false,
      availableFrom: d.availableFrom?.trim() || null,
      languages: d.languages?.trim() || null,
      drivingLicence: d.drivingLicence ?? false,
      cvUrl: d.cvUrl?.trim() || null,
      message: d.message?.trim() || "",
    },
  });

  await sendWorkerApplicationNotification({
    name: d.name,
    email: d.email,
    phone: d.phone,
    trades: d.trades,
    experienceYears: d.experienceYears,
    location: d.location,
    willingToTravel: d.willingToTravel,
    availableFrom: d.availableFrom,
    languages: d.languages,
    drivingLicence: d.drivingLicence,
    cvUrl: d.cvUrl,
    message: d.message,
  }).catch((err) => {
    console.error("Career application email notification failed:", err);
  });

  return NextResponse.json({ ok: true });
}
