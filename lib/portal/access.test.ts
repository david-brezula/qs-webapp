import { describe, it, expect } from "vitest";
import {
  isPortalPath,
  isAdminOnly,
  isWorkerAllowedAdminPath,
  isBlockedForWorker,
  isClientPath,
  isAllowedForClient,
} from "./access";

describe("isPortalPath", () => {
  it("matches portal paths and their sub-paths", () => {
    expect(isPortalPath("/wages")).toBe(true);
    expect(isPortalPath("/wages/advances")).toBe(true);
    expect(isPortalPath("/projects/abc/log")).toBe(true);
    expect(isPortalPath("/dashboard")).toBe(true);
    expect(isPortalPath("/portal")).toBe(true);
    expect(isPortalPath("/portal/abc")).toBe(true);
    expect(isPortalPath("/clients")).toBe(true);
    expect(isPortalPath("/clients/new")).toBe(true);
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
    expect(isBlockedForWorker("/clients")).toBe(true);
    expect(isBlockedForWorker("/clients/new")).toBe(true);
    expect(isBlockedForWorker("/clients/abc")).toBe(true);
  });
});

describe("isAdminOnly", () => {
  it("flags admin-only prefixes and edit/new subpaths", () => {
    expect(isAdminOnly("/wages")).toBe(true);
    expect(isAdminOnly("/clients")).toBe(true);
    expect(isAdminOnly("/projects/abc/sections/x/edit")).toBe(true);
    expect(isAdminOnly("/dashboard")).toBe(false);
    expect(isAdminOnly("/change-password")).toBe(false);
    expect(isAdminOnly("/portal")).toBe(false);
  });
});

describe("isClientPath", () => {
  it("matches the client area and its sub-paths", () => {
    expect(isClientPath("/portal")).toBe(true);
    expect(isClientPath("/portal/abc")).toBe(true);
  });
  it("does not match internal portal or marketing paths", () => {
    expect(isClientPath("/dashboard")).toBe(false);
    expect(isClientPath("/wages")).toBe(false);
    expect(isClientPath("/")).toBe(false);
  });
});

describe("isAllowedForClient (the proxy allow-list for CLIENT)", () => {
  it("allows only the client area and change-password", () => {
    expect(isAllowedForClient("/portal")).toBe(true);
    expect(isAllowedForClient("/portal/abc")).toBe(true);
    expect(isAllowedForClient("/change-password")).toBe(true);
  });
  it("blocks every internal/admin/worker path", () => {
    expect(isAllowedForClient("/dashboard")).toBe(false);
    expect(isAllowedForClient("/wages")).toBe(false);
    expect(isAllowedForClient("/wages/advances")).toBe(false);
    expect(isAllowedForClient("/projects")).toBe(false);
    expect(isAllowedForClient("/projects/abc/log")).toBe(false);
    expect(isAllowedForClient("/workers")).toBe(false);
    expect(isAllowedForClient("/accommodations")).toBe(false);
    expect(isAllowedForClient("/clients")).toBe(false);
  });
});
