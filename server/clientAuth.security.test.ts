import { describe, expect, it } from "vitest";
import { assertAuthRateLimit, createOneTimeToken, hashOneTimeToken, hashPassword, verifyPassword } from "./_core/clientAuth";

describe("client account authentication primitives", () => {
  it("hashes passwords with scrypt and verifies only the correct password", async () => {
    const encoded = await hashPassword("ICX-Example-Password-2026");
    expect(encoded).toMatch(/^scrypt\$16384\$8\$1\$/);
    await expect(verifyPassword("ICX-Example-Password-2026", encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", encoded)).resolves.toBe(false);
  });

  it("rejects weak passwords and unknown hash formats", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    await expect(verifyPassword("some-password", "plain-text-password")).resolves.toBe(false);
  });

  it("creates unpredictable one-time tokens and stores only a one-way hash", () => {
    const first = createOneTimeToken();
    const second = createOneTimeToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashOneTimeToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("limits repeated auth operations per key", () => {
    const key = `test:${crypto.randomUUID()}`;
    assertAuthRateLimit(key, 2, 60_000);
    assertAuthRateLimit(key, 2, 60_000);
    expect(() => assertAuthRateLimit(key, 2, 60_000)).toThrow("AUTH_RATE_LIMITED");
  });
});
