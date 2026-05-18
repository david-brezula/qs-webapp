import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact-schema";

const valid = {
  company: "Helios Energie",
  name: "Dana Park",
  email: "dana@example.com",
  projectType: "Ground-mount",
  sizeMW: 12.5,
  country: "Germany",
  startDate: "2026-08-15",
  scope: ["Racking & structural", "Electrical & BOS"],
  notes: "AC interconnect ready",
} as const;

describe("contactSchema", () => {
  it("accepts a fully-populated valid payload", () => {
    const r = contactSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects when required fields are missing", () => {
    const r = contactSchema.safeParse({ ...valid, company: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = contactSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects sizeMW <= 0", () => {
    const r = contactSchema.safeParse({ ...valid, sizeMW: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown projectType", () => {
    const r = contactSchema.safeParse({ ...valid, projectType: "Wind" });
    expect(r.success).toBe(false);
  });

  it("rejects empty scope array", () => {
    const r = contactSchema.safeParse({ ...valid, scope: [] });
    expect(r.success).toBe(false);
  });

  it("rejects unknown country", () => {
    const r = contactSchema.safeParse({ ...valid, country: "Atlantis" });
    expect(r.success).toBe(false);
  });

  it("accepts payload without notes (optional)", () => {
    const { notes: _notes, ...withoutNotes } = valid;
    const r = contactSchema.safeParse(withoutNotes);
    expect(r.success).toBe(true);
  });
});
