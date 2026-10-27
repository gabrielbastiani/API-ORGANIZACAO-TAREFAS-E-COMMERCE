import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(error);

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Dados inválidos",
      errors: error.flatten()
    });
    return;
  }

  res.status(500).json({
    message: "Erro interno do servidor"
  });
}