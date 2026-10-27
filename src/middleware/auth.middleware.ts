import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Token de autenticação não informado"
    });
    return;
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({
      message: "Token inválido ou expirado"
    });
  }
}