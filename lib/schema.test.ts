import { describe, expect, it } from "vitest";
import { organizationSchema, localBusinessSchema, serviceSchema, breadcrumbSchema } from "./schema";

describe("schema builders", () => {
  it("organization has required fields", () => {
    const s = organizationSchema("https://quantum-sphere.eu");
    expect(s["@context"]).toBe("https://schema.org");
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBe("Quantum Sphere s.r.o.");
    expect(s.url).toBe("https://quantum-sphere.eu");
    expect(Array.isArray(s.sameAs)).toBe(true);
  });

  it("organization omits logo when no asset is configured", () => {
    delete process.env.NEXT_PUBLIC_ORG_LOGO_URL;
    const s = organizationSchema("https://quantum-sphere.eu");
    expect(s.logo).toBeUndefined();
  });

  it("organization emits an absolute logo URL when configured", () => {
    process.env.NEXT_PUBLIC_ORG_LOGO_URL = "/logo.png";
    try {
      const s = organizationSchema("https://quantum-sphere.eu");
      expect(s.logo).toBe("https://quantum-sphere.eu/logo.png");
    } finally {
      delete process.env.NEXT_PUBLIC_ORG_LOGO_URL;
    }
  });

  it("localBusiness carries a postal address and telephone", () => {
    const s = localBusinessSchema("https://quantum-sphere.eu");
    expect(s["@type"]).toBe("GeneralContractor");
    expect(s.address["@type"]).toBe("PostalAddress");
    expect(s.telephone).toBeTruthy();
  });

  it("service links to its provider and area", () => {
    const s = serviceSchema("Solárne elektrárne", "https://quantum-sphere.eu/sk/solarne-elektrarne", "https://quantum-sphere.eu");
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Solárne elektrárne");
    expect(s.url).toBe("https://quantum-sphere.eu/sk/solarne-elektrarne");
    expect(s.provider["@type"]).toBe("Organization");
  });

  it("breadcrumb lists positioned items", () => {
    const s = breadcrumbSchema([
      { name: "Domov", url: "https://quantum-sphere.eu/sk" },
      { name: "Solár", url: "https://quantum-sphere.eu/sk/solar" },
    ]);
    expect(s.itemListElement[1].position).toBe(2);
  });
});
