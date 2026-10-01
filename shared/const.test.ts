import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "./const";

describe("OAuth state", () => {
  it("round-trips a safe post-login destination", () => {
    const state = encodeOAuthState({
      redirectUri: "https://icx.example/api/oauth/callback",
      nonce: "one-time-nonce",
      returnTo: "/admin",
    });
    expect(decodeOAuthState(state)).toEqual({
      redirectUri: "https://icx.example/api/oauth/callback",
      nonce: "one-time-nonce",
      returnTo: "/admin",
    });
  });

  it("does not create a nonce from malformed state", () => {
    expect(decodeOAuthState("%%%" )).toEqual({ redirectUri: "" });
  });
});
