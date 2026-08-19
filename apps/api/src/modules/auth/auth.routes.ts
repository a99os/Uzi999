import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { HttpError } from "../../middleware/error-handler";
import { REFRESH_COOKIE_NAME } from "./jwt";
import * as authService from "./auth.service";

export const authRouter = Router();

const isProd = process.env.NODE_ENV === "production";
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  }),
);

const refreshSchema = z.object({ refreshToken: z.string().optional() });

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body ?? {});
    const token = refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw new HttpError(401, "Missing refresh token");
    const result = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body ?? {});
    const token = refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" });
    res.status(204).end();
  }),
);
