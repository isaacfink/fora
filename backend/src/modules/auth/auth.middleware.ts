import type { Context, Next, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth.service.js";
import { getContext } from "hono/context-storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    [key: string]: unknown;
  };
  user: AuthUser;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
    session: AuthSession | null;
  }
}

export const authMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (session) {
      c.set("user", session.user as AuthUser);
      c.set("session", session as AuthSession);
    } else {
      c.set("user", null);
      c.set("session", null);
    }
  } catch (error) {
    c.set("user", null);
    c.set("session", null);
  }

  await next();
};

export const requireAuth: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  await next();
};

export const isAdmin: MiddlewareHandler = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  if (user.role !== "admin") {
    throw new HTTPException(403, {
      message: "Forbidden: Admin access required",
    });
  }

  await next();
};

export function getUser() {
  const user = getContext().get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return user;
}

export function getAdmin(): AuthUser {
  const user = getContext().get("user");

  if (!user || user.role !== "admin") {
    throw new HTTPException(403, {
      message: "Forbidden: Admin access required",
    });
  }

  return user;
}

export function getUserOptional(c: Context): AuthUser | null {
  return c.get("user") || null;
}
