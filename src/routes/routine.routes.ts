import { Router } from "express";
import { RecurrenceFrequency, TaskPriority } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

const routineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  frequency: z.nativeEnum(RecurrenceFrequency),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  preferredStartMin: z.number().int().min(0).max(1439).optional(),
  estimatedMinutes: z.number().int().positive(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  active: z.boolean().default(true)
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const data = routineSchema.parse(req.body);

    const routine = await prisma.routine.create({
      data: {
        userId,
        ...data
      }
    });

    res.status(201).json(routine);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const routines = await prisma.routine.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    res.json(routines);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const data = routineSchema.partial().parse(req.body);

    const routine = await prisma.routine.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!routine) {
      res.status(404).json({
        message: "Rotina não encontrada"
      });
      return;
    }

    const updatedRoutine = await prisma.routine.update({
      where: {
        id: routine.id
      },
      data
    });

    res.json(updatedRoutine);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const routine = await prisma.routine.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!routine) {
      res.status(404).json({
        message: "Rotina não encontrada"
      });
      return;
    }

    await prisma.routine.update({
      where: {
        id: routine.id
      },
      data: {
        active: false
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;