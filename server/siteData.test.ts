import { describe, expect, it } from "vitest";
import { programs, services } from "../client/src/lib/siteData";
import worldCountries from "../client/src/lib/world-countries.json";

describe("ICX site catalog", () => {
  it("exposes all eleven first-level services with dedicated routes", () => {
    expect(services).toHaveLength(11);
    expect(new Set(services.map(service => service.slug)).size).toBe(11);
    expect(services.every(service => service.tabs.length >= 4)).toBe(true);
    expect(services.every(service => service.tabs.length >= 5)).toBe(true);
    expect(
      services.every(
        service => service.subservices.length === service.tabs.length
      )
    ).toBe(true);
    expect(
      services.every(service =>
        service.subservices.every(items => items.length >= 3)
      )
    ).toBe(true);
    expect(
      services.some(
        service =>
          service.slug === "permis-travail" &&
          service.image.includes("work-contracts")
      )
    ).toBe(true);
    expect(new Set(services.map(service => service.architecture)).size).toBe(
      10
    );
  });

  it("offers a worldwide country list with telephone calling codes", () => {
    expect(worldCountries.length).toBeGreaterThanOrEqual(249);
    expect(
      worldCountries.some(
        country => country.code === "RO" && country.callingCodes.includes("+40")
      )
    ).toBe(true);
    expect(
      worldCountries.some(
        country => country.code === "JP" && country.callingCodes.includes("+81")
      )
    ).toBe(true);
  });

  it("includes an admissions example for every requested country", () => {
    const requestedCountries = [
      "France",
      "Canada",
      "USA",
      "Chine",
      "Russie",
      "Roumanie",
      "Pologne",
    ];
    expect(new Set(programs.map(program => program.country))).toEqual(
      new Set(requestedCountries)
    );
    expect(programs.every(program => program.documents.length >= 4)).toBe(true);
    expect(programs.length).toBeGreaterThanOrEqual(16);
    expect(
      programs.some(
        program =>
          program.university.includes("Babeș-Bolyai") &&
          program.city === "Cluj-Napoca"
      )
    ).toBe(true);
  });
});
