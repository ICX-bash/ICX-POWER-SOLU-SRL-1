import { describe, expect, it } from "vitest";
import { microsoftIdentityEmails, normalizeMicrosoftEmail } from "./microsoftAdmin";

describe("Microsoft admin identity normalization", () => {
  it("normalizes an email without changing the configured identity", () => {
    expect(normalizeMicrosoftEmail("  ICXPS.SALE@OUTLOOK.COM ")).toBe("icxps.sale@outlook.com");
    expect(normalizeMicrosoftEmail(null)).toBe("");
  });

  it("checks every Outlook identity claim so aliases are accepted", () => {
    expect(microsoftIdentityEmails(
      { mail: "primary-alias@outlook.com", userPrincipalName: "ICXPS.SALE@OUTLOOK.COM" },
      { preferred_username: "other-claim@outlook.com", email: "" },
    )).toEqual([
      "primary-alias@outlook.com",
      "icxps.sale@outlook.com",
      "other-claim@outlook.com",
    ]);
  });
});
