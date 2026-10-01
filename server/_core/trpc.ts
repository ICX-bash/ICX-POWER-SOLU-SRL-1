import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const isSuperAdminIdentity = (user: TrpcContext["user"]) => Boolean(
  user && (user.email?.toLowerCase() === ENV.superAdminEmail || user.openId === ENV.ownerOpenId),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    if (!ctx.adminAuthenticated) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Microsoft administrator session required" });
    }
    if (ctx.user.role !== "admin" && !isSuperAdminIdentity(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);


export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (!ctx.adminAuthenticated) throw new TRPCError({ code: "FORBIDDEN", message: "Microsoft administrator session required" });
    if (!isSuperAdminIdentity(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Super-administrator access required" });
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
