import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const publicContext = {
  user: undefined,
  adminAuthenticated: false,
  req: {} as any,
  res: {} as any,
};

describe("requests and notifications access", () => {
  it("rejects unauthenticated service submissions", async () => {
    const caller = appRouter.createCaller(publicContext);

    await expect(
      caller.requests.create({
        serviceKey: "etudes",
        firstName: "Test",
        lastName: "Client",
        email: "test@example.com",
        message: "Je souhaite préparer mon dossier.",
        attachments: [],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated notification access", async () => {
    const caller = appRouter.createCaller(publicContext);

    await expect(caller.notifications.mine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.admin.dashboard()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
  it("rejects admin operations for a regular user", async () => {
    const caller = appRouter.createCaller({ ...publicContext, user: { id: 7, openId: "regular", email: "client@example.com", name: "Client", role: "user" } as any });
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.files()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.isSuperAdmin()).resolves.toBe(false);
    await expect(caller.requests.updateStatus({ id: 1, status: "Accepté" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not grant admin access to an admin-role user without Microsoft admin authentication", async () => {
    const caller = appRouter.createCaller({ ...publicContext, user: { id: 8, openId: "client-admin-role", email: "client@example.com", name: "Client", role: "admin" } as any });
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recognizes the configured principal super-admin", async () => {
    const caller = appRouter.createCaller({ ...publicContext, adminAuthenticated: true, user: { id: 1, openId: "principal", email: "ICXPS.SALE@OUTLOOK.COM", name: "ICX Principal", role: "user" } as any });
    await expect(caller.admin.users()).resolves.toEqual(expect.any(Array));
    await expect(caller.auth.isSuperAdmin()).resolves.toBe(true);
  });

});
