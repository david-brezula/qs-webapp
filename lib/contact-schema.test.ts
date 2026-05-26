import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact-schema";

const valid = {
  name: "Dana Park",
  email: "dana@example.com",
  phone: "+421 900 000 000",
  company: "Acme s.r.o.",
  serviceType: "roofing",
  message: "We need a new roof on a 200 m² warehouse.",
  gdprConsent: true,
} as const;

describe("contactSchema", () => {
  it("accepts a fully-populated valid payload", () => {
    const r = contactSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("accepts a payload without optional phone/company", () => {
    const r = contactSchema.safeParse({
      name: valid.name,
      email: valid.email,
      serviceType: valid.serviceType,
      message: valid.message,
      gdprConsent: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const r = contactSchema.safeParse({ ...valid, name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = contactSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown serviceType", () => {
    const r = contactSchema.safeParse({ ...valid, serviceType: "plumbing" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty message", () => {
    const r = contactSchema.safeParse({ ...valid, message: "" });
    expect(r.success).toBe(false);
  });
});

describe("contactSchema GDPR consent", () => {
  const base = {
    name: "Test",
    email: "test@example.com",
    serviceType: "solar" as const,
    message: "hello",
    gdprConsent: true,
  };

  it("rejects when gdprConsent is missing", () => {
    const { gdprConsent: _omit, ...rest } = base;
    expect(contactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when gdprConsent is false", () => {
    expect(contactSchema.safeParse({ ...base, gdprConsent: false }).success).toBe(false);
  });

  it("accepts when gdprConsent is true", () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });
});

describe("contactSchema honeypot", () => {
  const base = {
    name: "Test",
    email: "test@example.com",
    serviceType: "solar" as const,
    message: "hello",
    gdprConsent: true,
  };

  it("accepts when _hp is omitted", () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it("accepts when _hp is empty string", () => {
    expect(contactSchema.safeParse({ ...base, _hp: "" }).success).toBe(true);
  });

  it("rejects when _hp has any content", () => {
    expect(contactSchema.safeParse({ ...base, _hp: "x" }).success).toBe(false);
  });
});
