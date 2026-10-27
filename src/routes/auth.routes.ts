import { Router } from "express";
import { z } from "zod";
import { comparePassword, createToken, hashPassword } from "../lib/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  timezone: z.string().default("America/Sao_Paulo"),
  workMode: z.enum(["SOLO", "TEAM"]).default("SOLO")
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase()
      }
    });

    if (existingUser) {
      res.status(409).json({
        message: "Já existe um usuário com este e-mail"
      });
      return;
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        timezone: data.timezone,
        workMode: data.workMode
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        workMode: true,
        createdAt: true
      }
    });

    const token = createToken(user.id);

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase()
      }
    });

    if (!user) {
      res.status(401).json({
        message: "E-mail ou senha inválidos"
      });
      return;
    }

    const passwordMatches = await comparePassword(
      data.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(401).json({
        message: "E-mail ou senha inválidos"
      });
      return;
    }

    const token = createToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        workMode: user.workMode
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;