import { describe, expect, it } from "vitest";
import { organizationSchema, localBusinessSchema, serviceSchema, breadcrumbSchema } from "./schema";

describe("schema builders", () => {
  it("organization has required fields", () => {
    const s = organizationSchema("https://quantum-sphere.eu");
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBe("Quantum Sphere s.r.o.");
    expect(s.url).toBe("https://quantum-sphere.eu");
    expect(typeof s.logo).toBe("string");
  });

  it("localBusiness carries a postal address and telephone", () => {
    const s = localBusinessSchema("https://quantum-sphere.eu");
    expect(s["@type"]).toBe("GeneralContractor");
    expect(s.address["@type"]).toBe("PostalAddress");
    expect(s.telephone).toBeTruthy();
  });

  it("service links to its provider and area", () => {
    const s = serviceSchema("solar", "Solárne elektrárne", "https://quantum-sphere.eu", "sk");
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Solárne elektrárne");
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
