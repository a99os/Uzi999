import type { NextFunction, Request, Response } from "express";
import type { RoleName } from "@anora/shared-types";

export function authorize(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!req.user.roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    next();
  };
}
