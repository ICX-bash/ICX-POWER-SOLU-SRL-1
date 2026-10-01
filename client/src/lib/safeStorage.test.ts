import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "./safeStorage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safe local storage access", () => {
  it("falls back without throwing when browser storage is blocked", () => {
    const restrictedWindow = Object.defineProperty({}, "localStorage", {
      get() {
        throw new Error("Storage access denied");
      },
    });
    vi.stubGlobal("window", restrictedWindow);

    expect(readLocalStorage("icx-locale")).toBeNull();
    expect(writeLocalStorage("icx-locale", "fr")).toBe(false);
    expect(removeLocalStorage("icx-locale")).toBe(false);
  });

  it("reads and writes values when browser storage is available", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    expect(writeLocalStorage("icx-locale", "fr")).toBe(true);
    expect(readLocalStorage("icx-locale")).toBe("fr");
    expect(removeLocalStorage("icx-locale")).toBe(true);
    expect(readLocalStorage("icx-locale")).toBeNull();
  });
});
