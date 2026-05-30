import { describe, it, expect } from "vitest";
import { careersSchema } from "@/lib/careers-schema";

const valid = {
  name: "Jan Novák",
  email: "jan@example.com",
  trades: ["solar"],
  gdprConsent: true,
};

describe("careersSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(careersSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces experienceYears from a string", () => {
    const r = careersSchema.safeParse({ ...valid, experienceYears: "5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.experienceYears).toBe(5);
  });

  it("requires at least one trade", () => {
    expect(careersSchema.safeParse({ ...valid, trades: [] }).success).toBe(false);
  });

  it("rejects an unknown trade", () => {
    expect(careersSchema.safeParse({ ...valid, trades: ["plumbing"] }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(careersSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects an invalid cvUrl but allows empty string", () => {
    expect(careersSchema.safeParse({ ...valid, cvUrl: "not-a-url" }).success).toBe(false);
    expect(careersSchema.safeParse({ ...valid, cvUrl: "" }).success).toBe(true);
  });

  it("requires gdpr consent", () => {
    expect(careersSchema.safeParse({ ...valid, gdprConsent: false }).success).toBe(false);
  });

  it("fails when the honeypot is filled", () => {
    expect(careersSchema.safeParse({ ...valid, _hp: "bot" }).success).toBe(false);
  });
});
