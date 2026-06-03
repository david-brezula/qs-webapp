import { describe, it, expect } from "vitest";
import {
  isPortalPath,
  isAdminOnly,
  isWorkerAllowedAdminPath,
  isBlockedForWorker,
} from "./access";

describe("isPortalPath", () => {
  it("matches portal paths and their sub-paths", () => {
    expect(isPortalPath("/wages")).toBe(true);
    expect(isPortalPath("/wages/advances")).toBe(true);
    expect(isPortalPath("/projects/abc/log")).toBe(true);
    expect(isPortalPath("/dashboard")).toBe(true);
  });
  it("does not match marketing paths", () => {
    expect(isPortalPath("/")).toBe(false);
    expect(isPortalPath("/about")).toBe(false);
    expect(isPortalPath("/work/solar-farm")).toBe(false);
  });
});

describe("isWorkerAllowedAdminPath", () => {
  it("allows the worker-scoped pages under admin-only prefixes", () => {
    expect(isWorkerAllowedAdminPath("/wages")).toBe(true);
    expect(isWorkerAllowedAdminPath("/wages/advances")).toBe(true);
    expect(isWorkerAllowedAdminPath("/projects/abc/log")).toBe(true);
    expect(isWorkerAllowedAdminPath("/projects/abc/log/")).toBe(true);
  });
  it("does not allow admin-only drill-downs", () => {
    expect(isWorkerAllowedAdminPath("/wages/projects/abc")).toBe(false);
    expect(isWorkerAllowedAdminPath("/projects/abc")).toBe(false);
    expect(isWorkerAllowedAdminPath("/projects/abc/edit")).toBe(false);
  });
});

describe("isBlockedForWorker (the proxy redirect condition)", () => {
  it("lets workers reach their own wages and advances", () => {
    expect(isBlockedForWorker("/wages")).toBe(false);
    expect(isBlockedForWorker("/wages/advances")).toBe(false);
    expect(isBlockedForWorker("/dashboard")).toBe(false);
    expect(isBlockedForWorker("/projects/abc/log")).toBe(false);
    expect(isBlockedForWorker("/change-password")).toBe(false);
  });
  it("blocks workers from admin-only areas", () => {
    expect(isBlockedForWorker("/wages/projects/abc")).toBe(true);
    expect(isBlockedForWorker("/wages/export.csv")).toBe(true);
    expect(isBlockedForWorker("/projects")).toBe(true);
    expect(isBlockedForWorker("/projects/abc")).toBe(true);
    expect(isBlockedForWorker("/projects/abc/edit")).toBe(true);
    expect(isBlockedForWorker("/workers")).toBe(true);
    expect(isBlockedForWorker("/accommodations")).toBe(true);
  });
});

describe("isAdminOnly", () => {
  it("flags admin-only prefixes and edit/new subpaths", () => {
    expect(isAdminOnly("/wages")).toBe(true);
    expect(isAdminOnly("/projects/abc/sections/x/edit")).toBe(true);
    expect(isAdminOnly("/dashboard")).toBe(false);
    expect(isAdminOnly("/change-password")).toBe(false);
  });
});
