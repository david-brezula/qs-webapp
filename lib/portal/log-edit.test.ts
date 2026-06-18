import { describe, it, expect } from "vitest";
import { canEditLog } from "./log-edit";

describe("canEditLog", () => {
  it("lets admins edit anything, invoiced or not, own or not", () => {
    expect(canEditLog({ isAdmin: true, isOwn: false, sectionInvoiced: true })).toBe(true);
    expect(canEditLog({ isAdmin: true, isOwn: true, sectionInvoiced: false })).toBe(true);
  });

  it("lets a worker edit their own entry while the section is not invoiced", () => {
    expect(canEditLog({ isAdmin: false, isOwn: true, sectionInvoiced: false })).toBe(true);
  });

  it("locks a worker's own entry once the section is invoiced", () => {
    expect(canEditLog({ isAdmin: false, isOwn: true, sectionInvoiced: true })).toBe(false);
  });

  it("never lets a worker touch another worker's entry", () => {
    expect(canEditLog({ isAdmin: false, isOwn: false, sectionInvoiced: false })).toBe(false);
    expect(canEditLog({ isAdmin: false, isOwn: false, sectionInvoiced: true })).toBe(false);
  });
});
