import { describe, it, expect } from "vitest";
import { parseCreateClient } from "./clients-schema";

describe("parseCreateClient", () => {
  it("accepts a valid client+login payload", () => {
    const r = parseCreateClient({
      name: "Acme s.r.o.", company: "Acme", email: "a@acme.test",
      username: "acme", password: "supersecret",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a short password and a bad username", () => {
    const r = parseCreateClient({ name: "X", company: "", email: "", username: "A B", password: "short" });
    expect(r.success).toBe(false);
  });
});
