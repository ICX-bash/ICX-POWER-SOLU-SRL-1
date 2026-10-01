import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getMicrosoftAdminSessionUser } from "./microsoftAdmin";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminAuthenticated: boolean;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let adminAuthenticated = false;
  try {
    // Only the separately-built admin app may authenticate using Microsoft's
    // dedicated cookie; the public client session is never an admin session.
    if (opts.req.header("x-icx-admin-console") === "1") {
      user = await getMicrosoftAdminSessionUser(opts.req);
      adminAuthenticated = Boolean(user);
    } else {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }
  return { req: opts.req, res: opts.res, user, adminAuthenticated };
}
